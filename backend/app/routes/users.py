from fastapi import APIRouter, Depends, HTTPException
from app.schemas.user import UserUpdate, UserResponse
from app.services.user_service import UserService
from app.core.dependencies import get_current_user
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: UserModel = Depends(get_current_user)
):
    updated_user = await UserService.update_user(str(current_user.id), update_data)
    return ResponseModel.success(data=updated_user, message="Profile updated successfully")

@router.get("/search", response_model=list[UserResponse])
async def search_users(query: str):
    users = await UserService.search_users(query)
    return ResponseModel.success(data=[UserResponse(**u) for u in users])

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: str):
    user_profile = await UserService.get_user_profile(user_id)
    if not user_profile:
        raise HTTPException(status_code=404, detail="User not found")
    return ResponseModel.success(data=UserResponse(**user_profile))

@router.post("/{user_id}/follow")
async def follow_user(
    user_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    success = await UserService.follow_user(str(current_user.id), user_id)
    if not success:
         raise HTTPException(status_code=400, detail="Cannot follow user")
    return ResponseModel.success(message="User followed successfully")

@router.delete("/{user_id}/follow")
async def unfollow_user(
    user_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    success = await UserService.unfollow_user(str(current_user.id), user_id)
    if not success:
         raise HTTPException(status_code=400, detail="Cannot unfollow user")
    return ResponseModel.success(message="User unfollowed successfully")

@router.get("/{user_id}/businesses")
async def get_user_businesses(user_id: str):
    businesses = await UserService.get_user_businesses(user_id)
    # Convert to BusinessResponse to handle ObjectId serialization
    from app.schemas.business import BusinessResponse
    return ResponseModel.success(data=[BusinessResponse(**b) for b in businesses])

@router.post("/bookmarks/{business_id}")
async def toggle_bookmark(
    business_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    success = await UserService.toggle_bookmark(str(current_user.id), business_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to toggle bookmark")
    return ResponseModel.success(message="Bookmark updated successfully")

@router.get("/me/bookmarks")
async def get_my_bookmarks(
    current_user: UserModel = Depends(get_current_user)
):
    businesses = await UserService.get_bookmarked_businesses(str(current_user.id))
    from app.schemas.business import BusinessResponse
    return ResponseModel.success(data=[BusinessResponse(**b) for b in businesses])
