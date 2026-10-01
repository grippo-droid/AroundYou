"""
Backfill embeddings for businesses that don't have one yet (or, with
--force, re-embed everyone -- useful after changing EMBEDDING_MODEL or
EMBEDDING_DIMENSIONS).

Reuses the real app code (ai_service.embed_text, business_service.build_embed_text)
rather than reimplementing embedding logic, so backfilled data is generated
exactly the same way as create/update do it live.

SAFETY: dry-run by default. Nothing is written to the database unless you
pass --apply. Always run without --apply first and read the output before
adding it.

Usage:
    # Preview only -- shows counts, loads no model, writes nothing
    venv/Scripts/python.exe scripts/backfill_embeddings.py

    # Actually generate and write embeddings for businesses missing one
    venv/Scripts/python.exe scripts/backfill_embeddings.py --apply

    # Re-embed ALL businesses, not just ones missing an embedding
    venv/Scripts/python.exe scripts/backfill_embeddings.py --apply --force

Embeddings are generated locally (EMBEDDING_MODEL, sentence-transformers),
so no API key is needed; the first run downloads the model (~90 MB).

Reads MONGO_URI and DB_NAME from the environment (same as the app). To
target production, set these as one-off env vars for this command only --
do NOT put production credentials in backend/.env.

    PowerShell example:
        $env:MONGO_URI = "mongodb+srv://...production connection string..."
        $env:DB_NAME = "around_you_db"
        venv/Scripts/python.exe scripts/backfill_embeddings.py
        # review the dry-run output, THEN:
        venv/Scripts/python.exe scripts/backfill_embeddings.py --apply
        # when done, close the terminal or unset these so they don't
        # linger in your shell session.
"""

import argparse
import asyncio
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # backend/ -- so `app.*` imports below resolve

from app.config.database import db, get_database
from app.config.settings import settings
from app.services import ai_service
from app.services.business_service import build_embed_text

BATCH_SIZE = 20  # sequential batches -- keeps this simple and easy to reason
                  # about; not worth the complexity of true concurrent batching
                  # at this project's scale (dozens to low hundreds of businesses).


async def run(apply: bool, force: bool) -> None:
    print(f"Target database: {settings.DB_NAME}")
    print(f"Mode: {'APPLY (will write to the database)' if apply else 'DRY RUN (no writes)'}")
    if force:
        print("--force set: re-embedding ALL businesses, not just ones missing an embedding")

    db.connect()
    database = get_database()

    query = {} if force else {"embedding": None}
    businesses = await database.businesses.find(
        query, {"name": 1, "category": 1, "description": 1, "services": 1}
    ).to_list(length=None)

    total = len(businesses)
    print(f"\n{total} business(es) to embed.")
    if total == 0:
        print("Nothing to do.")
        db.close()
        return

    if not apply:
        print("\nDry run -- showing the first 5 businesses that would be embedded:")
        for b in businesses[:5]:
            print(f"  - {b.get('name')} ({b['_id']})")
        print("\nRe-run with --apply to actually generate and write embeddings.")
        db.close()
        return

    succeeded = 0
    failed = 0
    for i in range(0, total, BATCH_SIZE):
        batch = businesses[i : i + BATCH_SIZE]
        print(f"Processing {i + 1}-{i + len(batch)} of {total}...")
        for b in batch:
            text = build_embed_text(
                b.get("name", ""), b.get("category", ""), b.get("description", ""), b.get("services")
            )
            embedding = await ai_service.embed_text(text)
            if embedding is None:
                print(f"  FAILED: {b.get('name')} ({b['_id']}) -- left unembedded, re-run later")
                failed += 1
                continue
            await database.businesses.update_one(
                {"_id": b["_id"]},
                {"$set": {"embedding": embedding, "embedding_updated_at": datetime.utcnow()}},
            )
            succeeded += 1

    print(f"\nDone. {succeeded} succeeded, {failed} failed.")
    if failed:
        print("Re-run this script (without --force) to retry the failed ones.")

    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Actually write embeddings (default: dry run)")
    parser.add_argument("--force", action="store_true", help="Re-embed all businesses, not just missing ones")
    args = parser.parse_args()
    asyncio.run(run(apply=args.apply, force=args.force))
