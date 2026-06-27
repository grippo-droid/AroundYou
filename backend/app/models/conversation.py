from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId

class ConversationParticipant(BaseModel):
    id: PyObjectId
    type: str # "user" or "business"

class ConversationModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    participants: List[ConversationParticipant]
    last_message: str
    last_message_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
