from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from app.utils.object_id import PyObjectId

class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    email: Optional[EmailStr] = None
    phone: str
    password_hash: str
    role: str = "user"  # user, business, admin
    is_verified: bool = False
    followers: List[str] = []
    following: List[str] = []
    followed_businesses: List[str] = []
    bookmarked_businesses: List[str] = []
    applied_jobs: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {datetime: lambda v: v.isoformat()}
