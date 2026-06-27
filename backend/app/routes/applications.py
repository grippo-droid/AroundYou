from fastapi import APIRouter, Depends, status, HTTPException
from app.schemas.application import ApplicationCreate, ApplicationStatusUpdate
from app.services.application_service import ApplicationService
from app.services.job_service import JobService
from app.core.dependencies import get_current_user, get_current_business_owner
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()


@router.get("/my-job-ids")
async def get_my_applied_job_ids(
    current_user: UserModel = Depends(get_current_user),
):
    job_ids = await ApplicationService.get_applied_job_ids(str(current_user.id))
    return ResponseModel.success(data=job_ids)


@router.post("/jobs/{job_id}/apply", status_code=status.HTTP_201_CREATED)
async def apply_for_job(
    job_id: str,
    data: ApplicationCreate,
    current_user: UserModel = Depends(get_current_user),
):
    job = await JobService.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    application = await ApplicationService.submit_application(
        job_id, job.title, job.business_id, str(current_user.id), data
    )
    if application is None:
        raise HTTPException(status_code=409, detail="You have already applied for this job")
    return ResponseModel.success(data=application, message="Application submitted successfully", status_code=201)


@router.get("/jobs/{job_id}")
async def get_job_applications(
    job_id: str,
    current_user: UserModel = Depends(get_current_business_owner),
):
    apps = await ApplicationService.get_applications_by_job(job_id)
    return ResponseModel.success(data=apps)


@router.get("/business/{business_id}")
async def get_business_applications(
    business_id: str,
    current_user: UserModel = Depends(get_current_business_owner),
):
    apps = await ApplicationService.get_applications_by_business(business_id)
    return ResponseModel.success(data=apps)


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: str,
    current_user: UserModel = Depends(get_current_business_owner),
):
    ok = await ApplicationService.delete_application(application_id, str(current_user.id))
    if not ok:
        raise HTTPException(status_code=404, detail="Application not found or not authorized")
    return None


@router.put("/{application_id}/status")
async def update_application_status(
    application_id: str,
    body: ApplicationStatusUpdate,
    current_user: UserModel = Depends(get_current_business_owner),
):
    ok = await ApplicationService.update_application_status(
        application_id, body.status, str(current_user.id)
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Application not found or not authorized")
    return ResponseModel.success(message="Status updated")
