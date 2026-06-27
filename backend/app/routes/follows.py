from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.dependencies import get_current_user
from app.config.database import get_database
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()


@router.post("/businesses/{business_id}/follow")
async def toggle_follow(
    business_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    if not ObjectId.is_valid(business_id):
        raise HTTPException(status_code=404, detail="Business not found")

    db = get_database()
    business = await db.businesses.find_one({"_id": ObjectId(business_id)})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    user_id = str(current_user.id)
    already_following = business_id in (current_user.followed_businesses or [])

    if already_following:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"followed_businesses": business_id}},
        )
        await db.businesses.update_one(
            {"_id": ObjectId(business_id)},
            {"$inc": {"followers": -1}},
        )
        new_count = max(0, business.get("followers", 0) - 1)
        is_following = False
    else:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$addToSet": {"followed_businesses": business_id}},
        )
        await db.businesses.update_one(
            {"_id": ObjectId(business_id)},
            {"$inc": {"followers": 1}},
        )
        new_count = business.get("followers", 0) + 1
        is_following = True

    return ResponseModel.success(data={"following": is_following, "follower_count": new_count})


@router.get("/businesses/{business_id}/followers")
async def get_follower_count(business_id: str):
    if not ObjectId.is_valid(business_id):
        raise HTTPException(status_code=404, detail="Business not found")

    db = get_database()
    business = await db.businesses.find_one(
        {"_id": ObjectId(business_id)}, {"followers": 1}
    )
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    return ResponseModel.success(data={"follower_count": business.get("followers", 0)})


@router.get("/users/me/following")
async def get_my_following(current_user: UserModel = Depends(get_current_user)):
    return ResponseModel.success(data=current_user.followed_businesses or [])
