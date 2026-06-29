import asyncio
from typing import List, Optional
from datetime import datetime, timedelta, date
from bson import ObjectId
from app.config.database import get_database
from app.models.business import BusinessModel
from app.models.user import UserModel
from app.schemas.business import BusinessCreate, BusinessUpdate

class BusinessService:
    @staticmethod
    async def create_business(owner_id: str, business_data: BusinessCreate) -> BusinessModel:
        db = get_database()
        new_business = BusinessModel(
            owner_id=owner_id,
            **business_data.model_dump(),
            verification_status="pending",
            is_verified=False,
        )
        result = await db.businesses.insert_one(new_business.model_dump(by_alias=True, exclude={"id"}))
        new_business.id = result.inserted_id
        return new_business

    @staticmethod
    async def get_businesses(category: Optional[str] = None, search: Optional[str] = None, skip: int = 0, limit: int = 12) -> dict:
        db = get_database()
        query: dict = {"is_active": {"$ne": False}}
        if category:
            query["category"] = category
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"category": {"$regex": search, "$options": "i"}}
            ]

        cursor = db.businesses.find(query).sort([("is_verified", -1), ("created_at", -1), ("_id", -1)]).skip(skip).limit(limit)
        raw, total = await asyncio.gather(
            cursor.to_list(length=limit),
            db.businesses.count_documents(query),
        )
        businesses = [BusinessModel(**b) for b in raw]
        return {
            "businesses": businesses,
            "total": total,
            "has_more": (skip + len(businesses)) < total,
        }

    @staticmethod
    async def get_business_by_id(business_id: str) -> Optional[BusinessModel]:
        db = get_database()
        if not ObjectId.is_valid(business_id):
            return None
        doc = await db.businesses.find_one({"_id": ObjectId(business_id)})
        if doc:
            return BusinessModel(**doc)
        return None

    @staticmethod
    async def get_my_businesses(owner_id: str) -> List[BusinessModel]:
        db = get_database()
        cursor = db.businesses.find({"owner_id": owner_id})
        businesses = await cursor.to_list(length=100)
        return [BusinessModel(**b) for b in businesses]
    @staticmethod
    async def delete_business(business_id: str, owner_id: str) -> bool:
        db = get_database()
        if not ObjectId.is_valid(business_id):
            return False
            
        result = await db.businesses.delete_one({
            "_id": ObjectId(business_id),
            "owner_id": owner_id
        })
        return result.deleted_count > 0

    @staticmethod
    async def update_business(business_id: str, owner_id: str, business_data: BusinessUpdate) -> Optional[BusinessModel]:
        db = get_database()
        if not ObjectId.is_valid(business_id):
            return None
            
        update_data = {k: v for k, v in business_data.model_dump().items() if v is not None}
        
        if not update_data:
            return await BusinessService.get_business_by_id(business_id)

        result = await db.businesses.update_one(
            {"_id": ObjectId(business_id), "owner_id": owner_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            # Check if it was a match but no modification (still success) or no match
            matched = await db.businesses.find_one({"_id": ObjectId(business_id), "owner_id": owner_id})
            if not matched:
                return None
                
        return await BusinessService.get_business_by_id(business_id)

        return await BusinessService.get_business_by_id(business_id)

    @staticmethod
    async def add_staff(business_id: str, owner_id: str, name: str, phone: str, designation: str) -> bool:
        db = get_database()
        if not ObjectId.is_valid(business_id):
            return False
            
        staff_member = {
            "id": str(ObjectId()),
            "name": name,
            "phone": phone,
            "designation": designation,
            "joined_at": datetime.utcnow()
        }
        
        # Add to business staff list
        result = await db.businesses.update_one(
            {"_id": ObjectId(business_id), "owner_id": owner_id},
            {"$push": {"staff": staff_member}}
        )
        return result.modified_count > 0

    @staticmethod
    async def remove_staff(business_id: str, owner_id: str, staff_id: str) -> bool:
        db = get_database()
        if not ObjectId.is_valid(business_id):
            return False

        result = await db.businesses.update_one(
            {"_id": ObjectId(business_id), "owner_id": owner_id},
            {"$pull": {"staff": {"id": staff_id}}}
        )
        return result.modified_count > 0

    @staticmethod
    async def increment_views(business_id: str) -> None:
        db = get_database()
        if not ObjectId.is_valid(business_id):
            return
        await db.businesses.update_one(
            {"_id": ObjectId(business_id)},
            {"$inc": {"views": 1}}
        )

    @staticmethod
    async def get_business_stats(business_id: str, owner_id: str) -> Optional[dict]:
        db = get_database()
        if not ObjectId.is_valid(business_id):
            return None

        business = await db.businesses.find_one({
            "_id": ObjectId(business_id),
            "owner_id": owner_id,
        })
        if not business:
            return None

        week_ago = datetime.utcnow() - timedelta(days=7)

        total_bookings = await db.bookings.count_documents({"business_id": business_id})
        pending_bookings = await db.bookings.count_documents(
            {"business_id": business_id, "status": "pending"}
        )
        bookings_this_week = await db.bookings.count_documents({
            "business_id": business_id,
            "created_at": {"$gte": week_ago},
        })

        pipeline = [
            {"$match": {
                "business_id": business_id,
                "created_at": {"$gte": week_ago},
            }},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id": 1}},
        ]
        raw = await db.bookings.aggregate(pipeline).to_list(length=7)

        today = date.today()
        day_counts = {
            (today - timedelta(days=i)).isoformat(): 0
            for i in range(6, -1, -1)
        }
        for r in raw:
            if r["_id"] in day_counts:
                day_counts[r["_id"]] = r["count"]

        return {
            "total_bookings": total_bookings,
            "pending_bookings": pending_bookings,
            "total_reviews": business.get("review_count", 0),
            "average_rating": round(business.get("rating", 0.0), 1),
            "total_views": business.get("views", 0),
            "bookings_this_week": bookings_this_week,
            "bookings_by_day": [{"date": d, "count": c} for d, c in day_counts.items()],
        }

    @staticmethod
    async def approve_business(business_id: str) -> Optional[BusinessModel]:
        db = get_database()
        if not ObjectId.is_valid(business_id):
            return None
        await db.businesses.update_one(
            {"_id": ObjectId(business_id)},
            {"$set": {"verification_status": "approved", "is_verified": True}},
        )
        return await BusinessService.get_business_by_id(business_id)

    @staticmethod
    async def reject_business(business_id: str) -> Optional[BusinessModel]:
        db = get_database()
        if not ObjectId.is_valid(business_id):
            return None
        await db.businesses.update_one(
            {"_id": ObjectId(business_id)},
            {"$set": {"verification_status": "rejected", "is_active": False}},
        )
        return await BusinessService.get_business_by_id(business_id)

    @staticmethod
    async def get_business_staff(business_id: str) -> List[dict]:
        db = get_database()
        if not ObjectId.is_valid(business_id):
            return []
            
        business = await db.businesses.find_one({"_id": ObjectId(business_id)})
        if not business or "staff" not in business:
            return []
            
        return business["staff"]
