from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.models.user import UserModel
from app.schemas.message import MessageCreate
from app.services.message_service import MessageService
from app.utils.responses import ResponseModel

router = APIRouter()


@router.post("/send")
async def send_message(
    message_data: MessageCreate,
    current_user: UserModel = Depends(get_current_user),
):
    sender_type = current_user.role if current_user.role in ("user", "business") else "user"
    message = await MessageService.send_message(
        sender_id=str(current_user.id),
        sender_type=sender_type,
        message_data=message_data,
    )
    return ResponseModel.success(data=message, message="Message sent", status_code=201)


@router.get("/conversations")
async def get_conversations(
    current_user: UserModel = Depends(get_current_user),
):
    user_type = current_user.role if current_user.role in ("user", "business") else "user"
    conversations = await MessageService.get_user_conversations(
        user_id=str(current_user.id),
        user_type=user_type,
    )
    return ResponseModel.success(data=conversations)


@router.get("/{conversation_id}")
async def get_conversation_messages(
    conversation_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    messages = await MessageService.get_conversation_messages(conversation_id)
    return ResponseModel.success(data=messages)
