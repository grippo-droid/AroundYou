from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId


class DaySchedule(BaseModel):
    day: int          # 0=Mon … 6=Sun  (Python weekday() convention)
    start_time: str   # "09:00"
    end_time: str     # "18:00"
    is_active: bool = True


class AvailabilityModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    schedules: List[DaySchedule] = []
    slot_duration: int = 60   # minutes per appointment
    is_active: bool = True

    class Config:
        populate_by_name = True


class BookingModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    business_name: str
    user_id: str
    user_name: str
    user_phone: str
    service: Optional[str] = None
    date: str           # "YYYY-MM-DD"
    time_slot: str      # "HH:MM"
    status: str = "pending"   # pending | confirmed | cancelled | completed
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
