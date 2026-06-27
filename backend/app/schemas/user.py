from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.utils.object_id import PyObjectId

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    role: str = Field(default="user", pattern="^(user|business|admin)$")

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, v):
        if isinstance(v, str):
            return v.replace(" ", "").strip()
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    phone: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None

class UserResponse(UserBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    is_verified: bool = False
    followers: list[str] = []
    following: list[str] = []
    followers_count: int = 0
    following_count: int = 0
    businesses_count: int = 0
    bookmarked_businesses: list[str] = []
    created_at: datetime
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

class PublicUserProfile(BaseModel):
    id: PyObjectId = Field(alias="_id")
    name: str
    role: str
    is_verified: bool
    followers_count: int = 0
    following_count: int = 0
    businesses_count: int = 0
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
