import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None

    def connect(self):
        self.client = AsyncIOMotorClient(settings.MONGO_URI)
        logger.info("Connected to MongoDB")

    async def ensure_indexes(self):
        database = self.get_db()
        await database.bookings.create_index(
            [("business_id", 1), ("date", 1), ("time_slot", 1)],
            unique=True,
            partialFilterExpression={"status": {"$in": ["pending", "confirmed"]}},
            name="uniq_active_booking_slot",
        )
        await database.users.create_index(
            "phone",
            unique=True,
            name="uniq_user_phone",
        )
        await database.reviews.create_index(
            [("business_id", 1), ("user_id", 1)],
            unique=True,
            name="uniq_business_user_review",
        )

    def close(self):
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")

    def get_db(self):
        return self.client[settings.DB_NAME]

db = Database()

def get_database():
    return db.get_db()
