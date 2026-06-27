from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.config.database import get_database
from app.models.deal import DealModel
from app.schemas.deal import DealCreate


class DealService:
    @staticmethod
    async def create_deal(business_id: str, business_name: str, deal_data: DealCreate) -> DealModel:
        db = get_database()
        deal_dict = deal_data.model_dump()
        deal_dict["business_id"] = business_id
        deal_dict["business_name"] = business_name
        deal_dict["is_active"] = True
        deal_dict["created_at"] = datetime.utcnow()

        result = await db.deals.insert_one(deal_dict)
        return DealModel(**deal_dict, id=result.inserted_id)

    @staticmethod
    async def get_deals_by_business(business_id: str) -> List[DealModel]:
        db = get_database()
        cursor = db.deals.find({"business_id": business_id, "is_active": True}).sort("created_at", -1)
        deals = await cursor.to_list(length=50)
        return [DealModel(**d) for d in deals]

    @staticmethod
    async def get_all_active_deals(limit: int = 50) -> List[DealModel]:
        db = get_database()
        cursor = db.deals.find({"is_active": True}).sort("created_at", -1).limit(limit)
        deals = await cursor.to_list(length=limit)
        return [DealModel(**d) for d in deals]

    @staticmethod
    async def delete_deal(deal_id: str, owner_id: str) -> bool:
        db = get_database()
        if not ObjectId.is_valid(deal_id):
            return False

        deal = await db.deals.find_one({"_id": ObjectId(deal_id)})
        if not deal:
            return False

        # Verify the requesting user owns the business this deal belongs to
        if not ObjectId.is_valid(deal["business_id"]):
            return False
        business = await db.businesses.find_one({
            "_id": ObjectId(deal["business_id"]),
            "owner_id": owner_id,
        })
        if not business:
            return False

        result = await db.deals.delete_one({"_id": ObjectId(deal_id)})
        return result.deleted_count > 0
