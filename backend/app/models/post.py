from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId

class PostModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    business_name: str
    business_avatar: Optional[str] = None
    image: str
    caption: str
    likes: int = 0
    comments: List[Dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
