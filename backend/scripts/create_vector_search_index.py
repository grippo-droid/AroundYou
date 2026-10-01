"""
One-time setup: creates the Atlas Vector Search index used by
BusinessService.semantic_search(). Only works against a real MongoDB Atlas
cluster -- Atlas Search (including Vector Search) does not exist on
self-hosted/local MongoDB, so this will fail with a clear error if pointed
at a plain mongodb://localhost instance.

Run this once per database that needs semantic search (e.g. once for your
Atlas dev database, once for production). Index creation is asynchronous on
Atlas's side -- this script submits the request and reports the initial
status; the index typically takes anywhere from a few seconds to a couple
of minutes to finish building before queries against it will work.

Usage:
    venv/Scripts/python.exe scripts/create_vector_search_index.py

Reads MONGO_URI / DB_NAME from the environment (same as the app itself) --
does NOT hardcode any connection string. Point these at whichever database
you want the index created on before running.
"""

import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.operations import SearchIndexModel

INDEX_NAME = "business_embedding_index"
EMBEDDING_DIMENSIONS = int(os.environ.get("EMBEDDING_DIMENSIONS", "384"))  # all-MiniLM-L6-v2


async def main() -> None:
    mongo_uri = os.environ.get("MONGO_URI")
    db_name = os.environ.get("DB_NAME")
    if not mongo_uri or not db_name:
        print("Set MONGO_URI and DB_NAME in the environment before running this script.")
        print("These should point at the SAME database your app is configured to use.")
        sys.exit(1)

    print(f"Target database: {db_name}")
    print(f"Index name: {INDEX_NAME}, dimensions: {EMBEDDING_DIMENSIONS}")

    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]

    def _not_atlas_message(exc: Exception) -> None:
        print(f"Failed: {exc}")
        print(
            "If this is a self-hosted/local MongoDB instance (not Atlas), this is expected --"
            " Atlas Search (including Vector Search) is only available on Atlas."
        )

    try:
        existing = [idx async for idx in db.businesses.list_search_indexes()]
    except Exception as exc:
        _not_atlas_message(exc)
        client.close()
        sys.exit(1)

    definition = {
        "fields": [
            {
                "type": "vector",
                "path": "embedding",
                "numDimensions": EMBEDDING_DIMENSIONS,
                "similarity": "cosine",
            },
            {
                "type": "filter",
                "path": "is_active",
            },
        ]
    }

    current = next((idx for idx in existing if idx.get("name") == INDEX_NAME), None)
    if current is not None:
        current_fields = (current.get("latestDefinition") or {}).get("fields", [])
        current_dims = next(
            (f.get("numDimensions") for f in current_fields if f.get("type") == "vector"), None
        )
        if current_dims == EMBEDDING_DIMENSIONS:
            print(
                f"Index '{INDEX_NAME}' already exists with {current_dims} dimensions"
                f" (status: {current.get('status')}) -- nothing to do."
            )
            client.close()
            return

        # Dimension changed (e.g. after switching EMBEDDING_MODEL). Existing
        # embeddings of the old size won't be searchable -- re-run the backfill
        # with --force after this.
        print(f"Index '{INDEX_NAME}' exists with {current_dims} dimensions -- updating to {EMBEDDING_DIMENSIONS}.")
        try:
            await db.businesses.update_search_index(INDEX_NAME, definition)
            print("Submitted index update. Atlas rebuilds it in the background -- re-run this")
            print("script to check; it reports 'nothing to do' once the new definition is in place.")
        except Exception as exc:
            _not_atlas_message(exc)
            sys.exit(1)
        finally:
            client.close()
        return

    model = SearchIndexModel(definition=definition, name=INDEX_NAME, type="vectorSearch")

    try:
        result = await db.businesses.create_search_index(model)
        print(f"Submitted index creation request: {result}")
        print("Index is now building on Atlas -- this can take a few seconds to a couple")
        print("of minutes. Check status in the Atlas UI (Search tab) or by re-running this")
        print("script, which will report 'already exists' once it's live.")
    except Exception as exc:
        _not_atlas_message(exc)
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
