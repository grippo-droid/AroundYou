from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

class Database:
    client: AsyncIOMotorClient = None

    def connect(self):
        self.client = AsyncIOMotorClient(settings.MONGO_URI)
        print("Connected to MongoDB")

    def close(self):
        if self.client:
            self.client.close()
            print("Disconnected from MongoDB")

    def get_db(self):
        return self.client[settings.DB_NAME]

db = Database()

def get_database():
    return db.get_db()
