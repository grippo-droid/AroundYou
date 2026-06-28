from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId

class StaffMember(BaseModel):
    id: str = Field(default_factory=lambda: str(PyObjectId()))
    name: str
    phone: str
    designation: str
    joined_at: datetime = Field(default_factory=datetime.utcnow)

class BusinessModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    owner_id: str
    staff: List[StaffMember] = []
    name: str
    category: str
    description: str
    address: str
    city: str
    location: Dict[str, float] = Field(default_factory=lambda: {"lat": 0.0, "lng": 0.0})
    contact_number: str
    whatsapp: Optional[str] = None
    timings: List[Dict[str, str]] = []
    images: List[str] = []
    services: List[str] = []
    is_verified: bool = False
    is_active: bool = True
    rating: float = 0.0
    review_count: int = 0
    followers: int = 0
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
