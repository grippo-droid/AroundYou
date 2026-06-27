from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from app.schemas.deal import DealCreate, DealResponse
from app.services.deal_service import DealService
from app.services.business_service import BusinessService
from app.core.dependencies import get_current_business_owner
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()


@router.get("/", response_model=List[DealResponse])
async def get_all_deals(limit: int = 50):
    deals = await DealService.get_all_active_deals(limit)
    return ResponseModel.success(data=deals)


@router.get("/business/{business_id}", response_model=List[DealResponse])
async def get_business_deals(business_id: str):
    deals = await DealService.get_deals_by_business(business_id)
    return ResponseModel.success(data=deals)


@router.post("/business/{business_id}", status_code=status.HTTP_201_CREATED, response_model=DealResponse)
async def create_deal(
    business_id: str,
    deal_data: DealCreate,
    current_user: UserModel = Depends(get_current_business_owner),
):
    business = await BusinessService.get_business_by_id(business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if business.owner_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="You are not the owner of this business")

    deal = await DealService.create_deal(business_id, business.name, deal_data)
    return ResponseModel.success(data=deal, message="Deal created successfully", status_code=201)


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: str,
    current_user: UserModel = Depends(get_current_business_owner),
):
    success = await DealService.delete_deal(deal_id, str(current_user.id))
    if not success:
        raise HTTPException(status_code=404, detail="Deal not found or not authorized")
    return None
