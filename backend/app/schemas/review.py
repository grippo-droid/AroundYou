from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=10, max_length=1000)


class OwnerReplyCreate(BaseModel):
    reply: str = Field(..., min_length=1, max_length=2000)


class ReviewResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    user_id: str
    user_name: str
    rating: int
    text: str
    created_at: datetime
    owner_reply: Optional[str] = None
    owner_reply_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
