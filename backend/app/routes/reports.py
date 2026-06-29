from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.config.database import get_database
from app.core.dependencies import get_optional_user
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()

VALID_REASONS = {
    "incorrect_info",
    "closed_permanently",
    "spam_or_fake",
    "inappropriate_content",
    "other",
}


class ReportCreate(BaseModel):
    reason: str
    note: Optional[str] = None


@router.post("/business/{business_id}", status_code=201)
async def report_business(
    business_id: str,
    body: ReportCreate,
    current_user: Optional[UserModel] = Depends(get_optional_user),
):
    if body.reason not in VALID_REASONS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid report reason")

    db = get_database()
    await db.reports.insert_one({
        "business_id": business_id,
        "reporter_id": str(current_user.id) if current_user else None,
        "reason": body.reason,
        "note": body.note or "",
        "created_at": datetime.utcnow(),
    })
    return ResponseModel.success(message="Report submitted. Thank you for helping keep our platform safe.")
