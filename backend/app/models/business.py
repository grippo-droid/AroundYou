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
    verification_status: str = "pending"  # pending | approved | rejected
    is_verified: bool = False
    is_active: bool = True
    rating: float = 0.0
    review_count: int = 0
    followers: int = 0
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Semantic search fields. exclude=True keeps them out of model_dump() and
    # therefore out of every API response: routes return
    # ResponseModel.success(data=model), a JSONResponse that bypasses FastAPI's
    # response_model filtering, so BusinessResponse alone would not hide them.
    # They're also projected out of general-purpose reads in business_service.py;
    # only semantic_search() and the backfill script touch the raw embedding.
    embedding: Optional[List[float]] = Field(default=None, exclude=True)
    embedding_updated_at: Optional[datetime] = Field(default=None, exclude=True)
    # Transient, populated only on semantic_search() results ($addFields in
    # the aggregation) -- never persisted. The semantic search route adds it
    # to its response explicitly.
    similarity_score: Optional[float] = Field(default=None, exclude=True)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
