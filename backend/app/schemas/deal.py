from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId


class DealCreate(BaseModel):
    title: str
    description: str
    discount_label: str
    discount_percentage: Optional[float] = None
    original_price: Optional[str] = None
    deal_price: Optional[str] = None
    valid_until: Optional[datetime] = None


class DealResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    business_name: str
    title: str
    description: str
    discount_label: str
    discount_percentage: Optional[float] = None
    original_price: Optional[str] = None
    deal_price: Optional[str] = None
    valid_until: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
