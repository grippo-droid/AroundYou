from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.config.database import get_database
from app.models.application import ApplicationModel
from app.schemas.application import ApplicationCreate


class ApplicationService:
    @staticmethod
    async def submit_application(
        job_id: str,
        job_title: str,
        business_id: str,
        user_id: str,
        data: ApplicationCreate,
    ) -> Optional[ApplicationModel]:
        db = get_database()
        existing = await db.applications.find_one({"job_id": job_id, "applicant_user_id": user_id})
        if existing:
            return None

        app_dict = data.model_dump()
        app_dict["job_id"] = job_id
        app_dict["job_title"] = job_title
        app_dict["business_id"] = business_id
        app_dict["applicant_user_id"] = user_id
        app_dict["status"] = "pending"
        app_dict["created_at"] = datetime.utcnow()

        result = await db.applications.insert_one(app_dict)
        return ApplicationModel(**app_dict, id=result.inserted_id)

    @staticmethod
    async def get_applications_by_job(job_id: str) -> List[ApplicationModel]:
        db = get_database()
        cursor = db.applications.find({"job_id": job_id}).sort("created_at", -1)
        apps = await cursor.to_list(length=100)
        return [ApplicationModel(**a) for a in apps]

    @staticmethod
    async def get_applications_by_business(business_id: str) -> List[ApplicationModel]:
        db = get_database()
        cursor = db.applications.find({"business_id": business_id}).sort("created_at", -1)
        apps = await cursor.to_list(length=500)
        return [ApplicationModel(**a) for a in apps]

    @staticmethod
    async def update_application_status(application_id: str, status: str, owner_id: str) -> bool:
        db = get_database()
        if not ObjectId.is_valid(application_id):
            return False

        app = await db.applications.find_one({"_id": ObjectId(application_id)})
        if not app:
            return False

        if not ObjectId.is_valid(app["business_id"]):
            return False
        business = await db.businesses.find_one(
            {"_id": ObjectId(app["business_id"]), "owner_id": owner_id}
        )
        if not business:
            return False

        result = await db.applications.update_one(
            {"_id": ObjectId(application_id)},
            {"$set": {"status": status}},
        )
        return result.modified_count > 0

    @staticmethod
    async def delete_application(application_id: str, owner_id: str) -> bool:
        db = get_database()
        if not ObjectId.is_valid(application_id):
            return False

        app = await db.applications.find_one({"_id": ObjectId(application_id)})
        if not app:
            return False

        if not ObjectId.is_valid(app["business_id"]):
            return False
        business = await db.businesses.find_one(
            {"_id": ObjectId(app["business_id"]), "owner_id": owner_id}
        )
        if not business:
            return False

        result = await db.applications.delete_one({"_id": ObjectId(application_id)})
        return result.deleted_count > 0

    @staticmethod
    async def get_applied_job_ids(user_id: str) -> List[str]:
        db = get_database()
        cursor = db.applications.find({"applicant_user_id": user_id}, {"job_id": 1})
        docs = await cursor.to_list(length=500)
        return [d["job_id"] for d in docs]
