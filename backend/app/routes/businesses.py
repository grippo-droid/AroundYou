from typing import Optional, List
from fastapi import APIRouter, Depends, status, HTTPException, Body, BackgroundTasks
from app.schemas.business import BusinessCreate, BusinessResponse, BusinessUpdate, StaffSchema, StaffCreate
from app.services.business_service import BusinessService
from app.core.dependencies import get_current_user, get_current_business_owner
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()

@router.post("/", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_business(
    business_data: BusinessCreate,
    current_user: UserModel = Depends(get_current_business_owner)
):
    business = await BusinessService.create_business(str(current_user.id), business_data)
    return ResponseModel.success(data=business, message="Business created successfully", status_code=201)

@router.get("/")
async def get_businesses(
    category: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 12,
):
    result = await BusinessService.get_businesses(category, search, skip, limit)
    return ResponseModel.success(data=result)

@router.get("/my-businesses", response_model=List[BusinessResponse])
async def get_my_businesses(
    current_user: UserModel = Depends(get_current_business_owner)
):
    businesses = await BusinessService.get_my_businesses(str(current_user.id))
    return ResponseModel.success(data=businesses)

@router.get("/{business_id}/stats")
async def get_business_stats(
    business_id: str,
    current_user: UserModel = Depends(get_current_business_owner),
):
    stats = await BusinessService.get_business_stats(business_id, str(current_user.id))
    if stats is None:
        raise HTTPException(status_code=404, detail="Business not found or not authorized")
    return ResponseModel.success(data=stats)

@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(business_id: str, background_tasks: BackgroundTasks):
    business = await BusinessService.get_business_by_id(business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    background_tasks.add_task(BusinessService.increment_views, business_id)
    return ResponseModel.success(data=business)

@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business(
    business_id: str,
    current_user: UserModel = Depends(get_current_business_owner)
):
    success = await BusinessService.delete_business(business_id, str(current_user.id))
    if not success:
        # Check if business exists but belongs to another user vs doesn't exist
        business = await BusinessService.get_business_by_id(business_id)
        if not business:
             raise HTTPException(status_code=404, detail="Business not found")
        raise HTTPException(status_code=403, detail="Not authorized to delete this business")
    return None

@router.put("/{business_id}", response_model=BusinessResponse)
async def update_business(
    business_id: str,
    business_data: BusinessUpdate,
    current_user: UserModel = Depends(get_current_business_owner)
):
    updated_business = await BusinessService.update_business(business_id, str(current_user.id), business_data)
    if not updated_business:
        # Check if business exists but belongs to another user vs doesn't exist
        business = await BusinessService.get_business_by_id(business_id)
        if not business:
             raise HTTPException(status_code=404, detail="Business not found")
        raise HTTPException(status_code=403, detail="Not authorized to update this business")
    return ResponseModel.success(data=updated_business)

@router.get("/{business_id}/staff", response_model=List[StaffSchema])
async def get_business_staff(business_id: str):
    staff = await BusinessService.get_business_staff(business_id)
    return ResponseModel.success(data=staff)

@router.post("/{business_id}/staff", status_code=status.HTTP_201_CREATED)
async def add_business_staff(
    business_id: str,
    staff_data: StaffCreate,
    current_user: UserModel = Depends(get_current_business_owner)
):
    success = await BusinessService.add_staff(
        business_id, 
        str(current_user.id), 
        staff_data.name, 
        staff_data.phone, 
        staff_data.designation
    )
    if not success:
        business = await BusinessService.get_business_by_id(business_id)
        if not business:
             raise HTTPException(status_code=404, detail="Business not found")
        raise HTTPException(status_code=400, detail="Failed to add staff.")
    return ResponseModel.success(message="Staff member added successfully")

@router.delete("/{business_id}/staff/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_business_staff(
    business_id: str,
    staff_id: str,
    current_user: UserModel = Depends(get_current_business_owner)
):
    success = await BusinessService.remove_staff(business_id, str(current_user.id), staff_id)
    if not success:
        business = await BusinessService.get_business_by_id(business_id)
        if not business:
             raise HTTPException(status_code=404, detail="Business not found")
        raise HTTPException(status_code=400, detail="Failed to remove staff")
    return None
