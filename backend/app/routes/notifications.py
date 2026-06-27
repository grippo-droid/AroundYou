from fastapi import APIRouter, Depends, HTTPException
from app.services.notification_service import NotificationService
from app.core.dependencies import get_current_user
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()


@router.get("/unread-count")
async def get_unread_count(current_user: UserModel = Depends(get_current_user)):
    count = await NotificationService.get_unread_count(str(current_user.id))
    return ResponseModel.success(data={"count": count})


@router.get("/")
async def get_notifications(current_user: UserModel = Depends(get_current_user)):
    notifications = await NotificationService.get_user_notifications(str(current_user.id))
    return ResponseModel.success(data=notifications)


@router.put("/read-all")
async def mark_all_read(current_user: UserModel = Depends(get_current_user)):
    await NotificationService.mark_all_read(str(current_user.id))
    return ResponseModel.success(message="All notifications marked as read")


@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    ok = await NotificationService.mark_read(notification_id, str(current_user.id))
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return ResponseModel.success(message="Notification marked as read")
