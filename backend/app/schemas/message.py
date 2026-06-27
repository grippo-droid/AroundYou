from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId

class MessageCreate(BaseModel):
    receiver_id: str
    receiver_type: str # "user" or "business"
    content: str

class MessageResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    conversation_id: PyObjectId
    sender_id: PyObjectId
    sender_type: str
    content: str
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
