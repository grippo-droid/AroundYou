from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId


class DayScheduleInput(BaseModel):
    day: int = Field(..., ge=0, le=6)
    start_time: str
    end_time: str
    is_active: bool = True


class AvailabilitySet(BaseModel):
    schedules: List[DayScheduleInput]
    slot_duration: int = Field(default=60, ge=15, le=240)
    is_active: bool = True


class BookingCreate(BaseModel):
    service: Optional[str] = None
    date: str          # "YYYY-MM-DD"
    time_slot: str     # "HH:MM"
    notes: Optional[str] = None


class BookingStatusUpdate(BaseModel):
    status: str        # confirmed | cancelled | completed


class AvailabilityResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    schedules: List[DayScheduleInput]
    slot_duration: int
    is_active: bool

    class Config:
        populate_by_name = True


class BookingResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    business_id: str
    business_name: str
    user_id: str
    user_name: str
    user_phone: str
    service: Optional[str] = None
    date: str
    time_slot: str
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
