from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from app.schemas.post import PostCreate, PostResponse
from app.services.post_service import PostService
from app.services.business_service import BusinessService
from app.core.dependencies import get_current_business_owner, get_optional_user
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()

@router.post("/{business_id}", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    business_id: str,
    post_data: PostCreate,
    current_user: UserModel = Depends(get_current_business_owner)
):
    business = await BusinessService.get_business_by_id(business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if business.owner_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to post for this business")

    post = await PostService.create_post(business_id, business.name, None, post_data)
    return ResponseModel.success(data=post, message="Post created successfully", status_code=201)

@router.get("/business/{business_id}", response_model=List[PostResponse])
async def get_business_posts(business_id: str):
    posts = await PostService.get_posts_by_business(business_id)
    return ResponseModel.success(data=posts)

@router.get("/", response_model=List[PostResponse])
async def get_all_feed_posts(
    following: bool = Query(False),
    current_user: Optional[UserModel] = Depends(get_optional_user),
):
    if following and current_user and current_user.followed_businesses:
        posts = await PostService.get_following_posts(current_user.followed_businesses)
    else:
        posts = await PostService.get_all_posts()
    return ResponseModel.success(data=posts)
