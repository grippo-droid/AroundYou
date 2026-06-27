from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId

class JobModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    business_name: str
    business_logo: Optional[str] = None
    title: str
    description: str
    location: str
    type: str  # Full-time, Part-time
    salary: str
    posted_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    applicants: List[str] = []  # List of user_ids

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
