from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId

class PostCreate(BaseModel):
    image: str
    caption: str

class PostResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    business_name: str
    business_avatar: Optional[str] = None
    image: str
    caption: str
    likes: int
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
