import asyncio
from typing import Optional
from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config.database import get_database
from app.core.dependencies import get_current_user
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()


def require_admin(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


class RoleUpdate(BaseModel):
    role: str


class StatusUpdate(BaseModel):
    is_active: bool


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(current_user: UserModel = Depends(require_admin)):
    db = get_database()
    week_ago = datetime.utcnow() - timedelta(days=7)

    (
        total_users,
        total_businesses,
        total_bookings,
        total_reviews,
        new_users,
        new_businesses,
    ) = await asyncio.gather(
        db.users.count_documents({}),
        db.businesses.count_documents({}),
        db.bookings.count_documents({}),
        db.reviews.count_documents({}),
        db.users.count_documents({"created_at": {"$gte": week_ago}}),
        db.businesses.count_documents({"created_at": {"$gte": week_ago}}),
    )

    return ResponseModel.success(data={
        "total_users": total_users,
        "total_businesses": total_businesses,
        "total_bookings": total_bookings,
        "total_reviews": total_reviews,
        "new_users_this_week": new_users,
        "new_businesses_this_week": new_businesses,
    })


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: UserModel = Depends(require_admin),
):
    db = get_database()
    query: dict = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]

    cursor = db.users.find(query, {"password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
    raw, total = await asyncio.gather(cursor.to_list(length=limit), db.users.count_documents(query))

    for u in raw:
        u["_id"] = str(u["_id"])

    return ResponseModel.success(data={"users": raw, "total": total})


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: RoleUpdate,
    current_user: UserModel = Depends(require_admin),
):
    if body.role not in ("user", "business", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    db = get_database()
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": body.role}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return ResponseModel.success(message="Role updated")


# ── Businesses ────────────────────────────────────────────────────────────────

@router.get("/businesses")
async def list_businesses(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: UserModel = Depends(require_admin),
):
    db = get_database()
    query: dict = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
        ]

    cursor = db.businesses.find(query).sort("created_at", -1).skip(skip).limit(limit)
    raw, total = await asyncio.gather(cursor.to_list(length=limit), db.businesses.count_documents(query))

    for b in raw:
        b["_id"] = str(b["_id"])

    return ResponseModel.success(data={"businesses": raw, "total": total})


@router.put("/businesses/{business_id}/status")
async def update_business_status(
    business_id: str,
    body: StatusUpdate,
    current_user: UserModel = Depends(require_admin),
):
    db = get_database()
    if not ObjectId.is_valid(business_id):
        raise HTTPException(status_code=404, detail="Business not found")

    result = await db.businesses.update_one(
        {"_id": ObjectId(business_id)},
        {"$set": {"is_active": body.is_active}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Business not found")

    return ResponseModel.success(message="Status updated")


# ── Reviews ───────────────────────────────────────────────────────────────────

@router.get("/reviews")
async def list_reviews(
    skip: int = 0,
    limit: int = 20,
    current_user: UserModel = Depends(require_admin),
):
    db = get_database()
    cursor = db.reviews.find({}).sort("created_at", -1).skip(skip).limit(limit)
    raw, total = await asyncio.gather(cursor.to_list(length=limit), db.reviews.count_documents({}))

    for r in raw:
        r["_id"] = str(r["_id"])

    return ResponseModel.success(data={"reviews": raw, "total": total})


@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: str,
    current_user: UserModel = Depends(require_admin),
):
    db = get_database()
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=404, detail="Review not found")

    review = await db.reviews.find_one({"_id": ObjectId(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    await db.reviews.delete_one({"_id": ObjectId(review_id)})

    # Recalculate business rating
    business_id = review.get("business_id", "")
    if business_id and ObjectId.is_valid(business_id):
        remaining = await db.reviews.find({"business_id": business_id}).to_list(length=None)
        count = len(remaining)
        avg = sum(r.get("rating", 0) for r in remaining) / count if count else 0.0
        await db.businesses.update_one(
            {"_id": ObjectId(business_id)},
            {"$set": {"rating": round(avg, 1), "review_count": count}},
        )

    return ResponseModel.success(message="Review deleted")
