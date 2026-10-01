"""
Generic embedding-provider integration. Deliberately knows nothing about
businesses or any other domain model -- callers pass text in, get a vector
(or None) back.

Runs a local sentence-transformers model (default: all-MiniLM-L6-v2, 384
dims) in-process instead of calling a hosted API, so embedding has no
per-request cost and no API key. Tradeoff: torch + the model add ~1 GB to
the install and a few hundred MB of resident memory once loaded (see
requirements.txt).

The model is loaded lazily on first use, not at import time, so app startup
and the test suite never pay the torch import cost unless they actually
embed something.
"""

import asyncio
import logging
import threading
from typing import List, Optional

from app.config.settings import settings

logger = logging.getLogger(__name__)

_model = None
_model_lock = threading.Lock()


def _get_model():
    """Load the model once per process. Called from a worker thread."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer

                logger.info("Loading embedding model %s", settings.EMBEDDING_MODEL)
                model = SentenceTransformer(settings.EMBEDDING_MODEL, device="cpu")
                # Renamed in sentence-transformers 6; keep working on older versions.
                get_dims = getattr(model, "get_embedding_dimension", None) or model.get_sentence_embedding_dimension
                dims = get_dims()
                if dims != settings.EMBEDDING_DIMENSIONS:
                    # The Atlas index is built for EMBEDDING_DIMENSIONS -- vectors of
                    # any other size would be silently unsearchable, so refuse them.
                    raise RuntimeError(
                        f"{settings.EMBEDDING_MODEL} outputs {dims}-dim vectors but "
                        f"EMBEDDING_DIMENSIONS={settings.EMBEDDING_DIMENSIONS}"
                    )
                _model = model
    return _model


def _encode(text: str) -> List[float]:
    # Normalized so cosine similarity in the Atlas index behaves as expected.
    vector = _get_model().encode(text, normalize_embeddings=True)
    return vector.tolist()


async def embed_text(
    text: str,
    *,
    timeout: float = 10.0,
    max_attempts: int = 2,
) -> Optional[List[float]]:
    """
    Embed a string with the local sentence-transformers model.

    Returns None on any failure instead of raising -- embedding is always
    best-effort. Callers must not treat this as a hard dependency: a null
    return should leave the caller's operation (business create/update,
    semantic search) degrading gracefully, not failing.

    Inference is CPU-bound, so it runs in a worker thread to keep the event
    loop free. `timeout` bounds inference only; the one-time model load
    (which may include a first-run download) is excluded so a cold process
    doesn't fail its first request. `max_attempts` is kept for signature
    compatibility with the old hosted-API implementation -- local inference
    has no transient network failures worth retrying.
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
