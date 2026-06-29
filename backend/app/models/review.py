from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId


class ReviewModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    user_id: str
    user_name: str
    rating: int          # 1–5
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    owner_reply: Optional[str] = None
    owner_reply_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
