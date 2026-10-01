"""
Download the embedding model files (tokenizer + ONNX weights) into
EMBEDDING_MODEL_DIR. Runs as part of the Render build so the server never
fetches the model at runtime -- free-tier disk is rebuilt on every deploy and
there's no build cache, so without this every cold start would re-download.

Idempotent: files already present are reused. Pinned to
EMBEDDING_MODEL_REVISION so vectors match those already stored in Atlas.

Usage (from backend/):
    python scripts/download_embedding_model.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # backend/ -- so `app.*` imports below resolve

from app.config.settings import settings
from app.services.ai_service import MODEL_FILES, download_model_files


def main() -> None:
    print(f"Model: {settings.EMBEDDING_MODEL} @ {settings.EMBEDDING_MODEL_REVISION}")
    target = download_model_files()
    for name in MODEL_FILES:
        size_mb = (target / name).stat().st_size / 1e6
        print(f"  {name:<28} {size_mb:6.1f} MB")
    print(f"Ready in {target}")


if __name__ == "__main__":
    main()
