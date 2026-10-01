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
    # Semantic search -- never exposed via BusinessResponse/BusinessBase.
    # Excluded by projection in every general-purpose read in business_service.py;
    # only semantic_search() and the backfill script touch this field.
    embedding: Optional[List[float]] = None
    embedding_updated_at: Optional[datetime] = None
    # Transient, populated only on semantic_search() results ($addFields in
    # the aggregation) -- never persisted, always None from a plain read.
    similarity_score: Optional[float] = None

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
