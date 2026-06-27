import asyncio
from app.models.user import UserModel
from app.config.database import database

async def cleanup():
    # Connect to DB (Motor client needs event loop)
    # Since we are running as script, we might need to manually init or use the model directly if it uses the global db
    # database.client is initialized in main on startup. 
    # But here we need to connect manually.
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.config.settings import settings
    
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DB_NAME]
    
    # We need to hack the model to use this db instance or just use pymongo directly
    collection = db["users"]
    
    phone = "+919876543210" # The normalized phone from previous test
    result = await collection.delete_one({"phone": phone})
    
    if result.deleted_count > 0:
        print(f"Deleted user with phone {phone}")
    else:
        print(f"User with phone {phone} not found")

if __name__ == "__main__":
    asyncio.run(cleanup())
