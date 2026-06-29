from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.review import ReviewCreate, ReviewResponse, OwnerReplyCreate
from app.services.review_service import ReviewService
from app.core.dependencies import get_current_user, get_current_business_owner
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()


@router.get("/business/{business_id}")
async def get_reviews(business_id: str):
    reviews = await ReviewService.get_reviews_by_business(business_id)
    return ResponseModel.success(data=reviews)


@router.post("/business/{business_id}", status_code=status.HTTP_201_CREATED)
async def create_review(
    business_id: str,
    review_data: ReviewCreate,
    current_user: UserModel = Depends(get_current_user),
):
    review = await ReviewService.create_review(
        business_id=business_id,
        user_id=str(current_user.id),
        user_name=current_user.name,
        data=review_data,
    )
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this business",
        )
    return ResponseModel.success(data=review, message="Review submitted", status_code=201)


@router.put("/{review_id}/reply")
async def reply_to_review(
    review_id: str,
    body: OwnerReplyCreate,
    current_user: UserModel = Depends(get_current_business_owner),
):
    review = await ReviewService.reply_to_review(
        review_id=review_id,
        owner_id=str(current_user.id),
        reply=body.reply,
    )
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found or you are not the business owner",
        )
    return ResponseModel.success(data=review, message="Reply posted")
