from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId


class ApplicationModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    job_id: str
    job_title: str
    business_id: str
    applicant_user_id: str
    name: str
    phone: str
    email: str
    resume_url: Optional[str] = None
    cover_note: Optional[str] = None
    status: str = "pending"   # pending | reviewed | rejected | accepted
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
