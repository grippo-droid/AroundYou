from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.utils.object_id import PyObjectId
from app.models.conversation import ConversationParticipant

class ConversationResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    participants: List[ConversationParticipant]
    last_message: str
    last_message_at: datetime
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
