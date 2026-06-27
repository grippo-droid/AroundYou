from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from app.config.database import get_database
from app.models.review import ReviewModel
from app.schemas.review import ReviewCreate


class ReviewService:
    @staticmethod
    async def get_reviews_by_business(business_id: str) -> List[ReviewModel]:
        db = get_database()
        cursor = db.reviews.find({"business_id": business_id}).sort("created_at", -1)
        reviews = []
        async for doc in cursor:
            reviews.append(ReviewModel(**doc))
        return reviews

    @staticmethod
    async def create_review(
        business_id: str,
        user_id: str,
        user_name: str,
        data: ReviewCreate,
    ) -> Optional[ReviewModel]:
        db = get_database()

        existing = await db.reviews.find_one({"business_id": business_id, "user_id": user_id})
        if existing:
            return None  # duplicate review

        review_doc = {
            "business_id": business_id,
            "user_id": user_id,
            "user_name": user_name,
            "rating": data.rating,
            "text": data.text,
            "created_at": datetime.utcnow(),
        }
        result = await db.reviews.insert_one(review_doc)
        review_doc["_id"] = result.inserted_id

        # Recompute business avg rating + review count
        if ObjectId.is_valid(business_id):
            pipeline = [
                {"$match": {"business_id": business_id}},
                {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
            ]
            agg = await db.reviews.aggregate(pipeline).to_list(1)
            if agg:
                await db.businesses.update_one(
                    {"_id": ObjectId(business_id)},
                    {"$set": {"rating": round(agg[0]["avg"], 1), "review_count": agg[0]["count"]}},
                )

        # Notify the business owner
        if ObjectId.is_valid(business_id):
            business_doc = await db.businesses.find_one(
                {"_id": ObjectId(business_id)}, {"owner_id": 1, "name": 1}
            )
            if business_doc:
                from app.services.notification_service import NotificationService
                await NotificationService.create_notification(
                    user_id=business_doc["owner_id"],
                    type="new_review",
                    title="New Review Received",
                    body=f"{user_name} gave your business a {data.rating}-star review.",
                    related_id=str(result.inserted_id),
                )

        return ReviewModel(**review_doc)
