from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId

class BusinessBase(BaseModel):
    name: str = Field(..., min_length=2)
    category: str
    description: str
    address: str
    city: str
    location: Dict[str, float]
    contact_number: str
    whatsapp: Optional[str] = None
    timings: List[Dict[str, str]]
    images: List[str] = []
    services: List[str] = []

class BusinessCreate(BusinessBase):
    pass

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    timings: Optional[List[Dict[str, str]]] = None
    images: Optional[List[str]] = None
    services: Optional[List[str]] = None

class StaffSchema(BaseModel):
    id: str
    name: str
    phone: str
    designation: str
    joined_at: datetime

class StaffCreate(BaseModel):
    name: str
    phone: str
    designation: str

class BusinessResponse(BusinessBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    owner_id: str
    staff: List[StaffSchema] = []
    is_verified: bool
    rating: float
    review_count: int
    followers: int
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
