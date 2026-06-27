from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.config.database import get_database
from app.models.notification import NotificationModel


class NotificationService:
    @staticmethod
    async def create_notification(
        user_id: str,
        type: str,
        title: str,
        body: str,
        related_id: Optional[str] = None,
    ) -> NotificationModel:
        db = get_database()
        doc = {
            "user_id": user_id,
            "type": type,
            "title": title,
            "body": body,
            "is_read": False,
            "related_id": related_id,
            "created_at": datetime.utcnow(),
        }
        result = await db.notifications.insert_one(doc)
        doc["_id"] = result.inserted_id
        return NotificationModel(**doc)

    @staticmethod
    async def get_user_notifications(user_id: str) -> List[NotificationModel]:
        db = get_database()
        cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1).limit(30)
        docs = await cursor.to_list(length=30)
        return [NotificationModel(**d) for d in docs]

    @staticmethod
    async def mark_read(notification_id: str, user_id: str) -> bool:
        db = get_database()
        if not ObjectId.is_valid(notification_id):
            return False
        result = await db.notifications.update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"is_read": True}},
        )
        return result.modified_count > 0

    @staticmethod
    async def mark_all_read(user_id: str) -> None:
        db = get_database()
        await db.notifications.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True}},
        )

    @staticmethod
    async def get_unread_count(user_id: str) -> int:
        db = get_database()
        return await db.notifications.count_documents({"user_id": user_id, "is_read": False})
