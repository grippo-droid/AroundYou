from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.config.database import get_database
from app.models.job import JobModel
from app.schemas.job import JobCreate, JobUpdate

class JobService:
    @staticmethod
    async def create_job(business_id: str, business_name: str, job_data: JobCreate) -> JobModel:
        db = get_database()
        job_dict = job_data.dict()
        job_dict["business_id"] = business_id
        job_dict["business_name"] = business_name
        job_dict["posted_at"] = datetime.utcnow()
        job_dict["is_active"] = True
        job_dict["applicants"] = []
        
        result = await db.jobs.insert_one(job_dict)
        return JobModel(**job_dict, id=result.inserted_id)

    @staticmethod
    async def get_business_jobs(business_id: str) -> List[JobModel]:
        db = get_database()
        cursor = db.jobs.find({"business_id": business_id}).sort("posted_at", -1)
        jobs = await cursor.to_list(length=100)
        return [JobModel(**job) for job in jobs]

    @staticmethod
    async def get_all_jobs(limit: int = 20, skip: int = 0) -> List[JobModel]:
        db = get_database()
        cursor = db.jobs.find({"is_active": True}).sort("posted_at", -1).skip(skip).limit(limit)
        jobs = await cursor.to_list(length=limit)
        return [JobModel(**job) for job in jobs]

    @staticmethod
    async def get_job_by_id(job_id: str) -> Optional[JobModel]:
        db = get_database()
        if not ObjectId.is_valid(job_id):
            return None
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if job:
            return JobModel(**job)
        return None
