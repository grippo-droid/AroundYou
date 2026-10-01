"""
Generic embedding-provider integration. Deliberately knows nothing about
businesses or any other domain model -- callers pass text in, get a vector
(or None) back.

Runs all-MiniLM-L6-v2 in-process with ONNX Runtime + Hugging Face tokenizers,
using the ONNX export published in the model's own repo. Same weights and the
same mean-pooling + normalization sentence-transformers applies, so vectors
match the torch implementation (see tests/test_ai_service.py) -- without
torch, which alone cost ~195 MB of memory and pushed the server past Render's
free-tier 512 MB (measured on Linux: torch peak ~585 MB, ONNX ~281 MB).

The model is loaded once per process: warm_up() starts that in the
background at app startup, and the first embed_text() call loads it if
warm-up hasn't finished (or failed).
"""

import asyncio
import json
import logging
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import numpy as np

from app.config.settings import settings

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parents[2]
# Files needed from the model repo, relative to its root.
MODEL_FILES = ("tokenizer.json", "sentence_bert_config.json", "onnx/model.onnx")
DEFAULT_MAX_SEQ_LENGTH = 256


@dataclass
class _Model:
    tokenizer: object
    session: object
    input_names: frozenset


_model: Optional[_Model] = None
_model_lock = threading.Lock()


def model_dir() -> Path:
    path = Path(settings.EMBEDDING_MODEL_DIR)
    return path if path.is_absolute() else BACKEND_DIR / path


def download_model_files() -> Path:
    """Fetch the pinned model files into model_dir(). Used by the build step;
    also called as a fallback if the files are missing at load time."""
    from huggingface_hub import hf_hub_download

    target = model_dir()
    for filename in MODEL_FILES:
        hf_hub_download(
            settings.EMBEDDING_MODEL,
            filename,
            revision=settings.EMBEDDING_MODEL_REVISION,
            local_dir=target,
        )
    return target


def _get_model() -> _Model:
    """Load the model once per process. Called from a worker thread."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                import onnxruntime as ort
                from tokenizers import Tokenizer

                path = model_dir()
                if not all((path / f).exists() for f in MODEL_FILES):
                    logger.warning("Embedding model files missing in %s -- downloading", path)
                    download_model_files()

                logger.info("Loading embedding model from %s", path)
                config = json.loads((path / "sentence_bert_config.json").read_text(encoding="utf-8"))
                tokenizer = Tokenizer.from_file(str(path / "tokenizer.json"))
                tokenizer.enable_truncation(max_length=config.get("max_seq_length", DEFAULT_MAX_SEQ_LENGTH))
                tokenizer.no_padding()  # one text per call -- padding would only add masked tokens

                options = ort.SessionOptions()
                # Render's free tier has a fraction of a CPU; extra threads only add overhead.
                options.intra_op_num_threads = 1
                options.inter_op_num_threads = 1
                # Don't keep a growing allocator pool around between requests.
                options.enable_cpu_mem_arena = False
                session = ort.InferenceSession(
                    str(path / "onnx" / "model.onnx"), options, providers=["CPUExecutionProvider"]
                )

                dims = session.get_outputs()[0].shape[-1]
                if dims != settings.EMBEDDING_DIMENSIONS:
                    # The Atlas index is built for EMBEDDING_DIMENSIONS -- vectors of
                    # any other size would be silently unsearchable, so refuse them.
                    raise RuntimeError(
                        f"{settings.EMBEDDING_MODEL} outputs {dims}-dim vectors but "
                        f"EMBEDDING_DIMENSIONS={settings.EMBEDDING_DIMENSIONS}"
                    )
                _model = _Model(tokenizer, session, frozenset(i.name for i in session.get_inputs()))
    return _model


def _encode(text: str) -> List[float]:
    model = _get_model()
    encoding = model.tokenizer.encode(text)
    input_ids = np.array([encoding.ids], dtype=np.int64)
    attention_mask = np.array([encoding.attention_mask], dtype=np.int64)
    feeds = {"input_ids": input_ids, "attention_mask": attention_mask}
    if "token_type_ids" in model.input_names:
        feeds["token_type_ids"] = np.zeros_like(input_ids)

    token_embeddings = model.session.run(None, feeds)[0]  # (1, tokens, dims)
    # Mean pooling over real tokens, then L2 normalization -- what
    # sentence-transformers does for this model -- so cosine similarity in
    # the Atlas index behaves as expected.
    mask = attention_mask[..., None].astype(np.float32)
    pooled = (token_embeddings * mask).sum(axis=1) / np.clip(mask.sum(axis=1), 1e-9, None)
    vector = pooled[0] / np.linalg.norm(pooled[0])
    return vector.astype(float).tolist()


async def warm_up() -> None:
    """Load the model in the background so the first search doesn't pay for
    it. Never raises: if loading fails, embed_text() retries on first use."""
    try:
        await asyncio.to_thread(_get_model)
        logger.info("Embedding model warmed up")
    except Exception:
        logger.error("Embedding model warm-up failed -- will retry on first use", exc_info=True)


async def embed_text(
    text: str,
    *,
    timeout: float = 10.0,
    max_attempts: int = 2,
) -> Optional[List[float]]:
    """
    Embed a string with the local model.

    Returns None on any failure instead of raising -- embedding is always
    best-effort. Callers must not treat this as a hard dependency: a null
    return should leave the caller's operation (business create/update,
    semantic search) degrading gracefully, not failing.

    Inference is CPU-bound, so it runs in a worker thread to keep the event
    loop free. `timeout` bounds inference only; the one-time model load is
    excluded so a cold process doesn't fail its first request. `max_attempts`
    is kept for signature compatibility with the original hosted-API
    implementation -- local inference has no transient network failures
    worth retrying.
    """
    if not text or not text.strip():
        return None

    try:
        await asyncio.to_thread(_get_model)
    except Exception:
        logger.error("Failed to load embedding model %s", settings.EMBEDDING_MODEL, exc_info=True)
        return None

    try:
        return await asyncio.wait_for(asyncio.to_thread(_encode, text), timeout=timeout)
    except asyncio.TimeoutError:
        logger.error("Embedding timed out after %.1fs", timeout)
        return None
    except Exception:
        logger.error("Unexpected error generating embedding", exc_info=True)
        return None
