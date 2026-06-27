from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId

class JobBase(BaseModel):
    title: str
    description: str
    location: str
    type: str
    salary: str

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    salary: Optional[str] = None
    is_active: Optional[bool] = None

class JobResponse(JobBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    business_name: str
    business_logo: Optional[str] = None
    posted_at: datetime
    is_active: bool
    applicants: List[str] = []

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
