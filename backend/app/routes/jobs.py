from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from app.schemas.job import JobCreate, JobResponse
from app.services.job_service import JobService
from app.services.business_service import BusinessService
from app.core.dependencies import get_current_user, get_current_business_owner
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()

@router.get("/", response_model=List[JobResponse])
async def get_all_jobs(limit: int = 20, skip: int = 0):
    jobs = await JobService.get_all_jobs(limit, skip)
    return ResponseModel.success(data=jobs)

@router.get("/business/{business_id}", response_model=List[JobResponse])
async def get_business_jobs(business_id: str):
    jobs = await JobService.get_business_jobs(business_id)
    return ResponseModel.success(data=jobs)

@router.post("/business/{business_id}", status_code=status.HTTP_201_CREATED, response_model=JobResponse)
async def create_job(
    business_id: str, 
    job_data: JobCreate, 
    current_user: UserModel = Depends(get_current_business_owner)
):
    # Verify business ownership check
    business = await BusinessService.get_business_by_id(business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    if business.owner_id != str(current_user.id):
         raise HTTPException(status_code=403, detail="You are not the owner of this business")

    new_job = await JobService.create_job(business_id, business.name, job_data)
    return ResponseModel.success(data=new_job, message="Job posted successfully")

@router.get("/{job_id}", response_model=JobResponse)
async def get_job_details(job_id: str):
    job = await JobService.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return ResponseModel.success(data=job)
