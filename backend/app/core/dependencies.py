from typing import Optional
from bson import ObjectId
from fastapi import Request, HTTPException, status, Depends
from app.core.jwt import decode_access_token
from app.config.database import get_database
from app.models.user import UserModel
from app.config.settings import settings

async def get_current_user(request: Request) -> Optional[UserModel]:
    token = request.cookies.get(settings.COOKIE_NAME)
    token = request.cookies.get(settings.COOKIE_NAME)
    
    # Check for Authorization header if cookie is missing
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    db = get_database()
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format",
        )
        
    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return UserModel(**user_doc)

async def get_current_active_user(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    # Add logic here if you want to check for suspended users, etc.
    return current_user

async def get_current_business_owner(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    if current_user.role != "business" and current_user.role != "admin":
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Business account required.",
        )
    return current_user
