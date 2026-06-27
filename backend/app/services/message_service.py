from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from app.config.database import get_database
from app.models.conversation import ConversationModel, ConversationParticipant
from app.models.message import MessageModel
from app.schemas.message import MessageCreate

class MessageService:
    @staticmethod
    async def create_or_get_conversation(sender_id: str, sender_type: str, receiver_id: str, receiver_type: str) -> ConversationModel:
        db = get_database()
        
        # Check if conversation exists
        query = {
            "$and": [
                {"participants": {"$elemMatch": {"id": ObjectId(sender_id), "type": sender_type}}},
                {"participants": {"$elemMatch": {"id": ObjectId(receiver_id), "type": receiver_type}}}
            ]
        }
        
        existing_conversation = await db.conversations.find_one(query)
        
        if existing_conversation:
            return ConversationModel(**existing_conversation)
        
        # Create new conversation
        new_conversation = ConversationModel(
            participants=[
                ConversationParticipant(id=ObjectId(sender_id), type=sender_type),
                ConversationParticipant(id=ObjectId(receiver_id), type=receiver_type)
            ],
            last_message="",
            last_message_at=datetime.utcnow()
        )
        
        result = await db.conversations.insert_one(new_conversation.model_dump(by_alias=True, exclude={"id"}))
        new_conversation.id = result.inserted_id
        return new_conversation

    @staticmethod
    async def send_message(sender_id: str, sender_type: str, message_data: MessageCreate) -> MessageModel:
        db = get_database()
        
        # Get or create conversation
        conversation = await MessageService.create_or_get_conversation(
            sender_id, sender_type, message_data.receiver_id, message_data.receiver_type
        )
        
        # Create message
        new_message = MessageModel(
            conversation_id=conversation.id,
            sender_id=ObjectId(sender_id),
            sender_type=sender_type,
            content=message_data.content
        )
        
        result = await db.messages.insert_one(new_message.model_dump(by_alias=True, exclude={"id"}))
        new_message.id = result.inserted_id
        
        # Update conversation
        await db.conversations.update_one(
            {"_id": conversation.id},
            {
                "$set": {
                    "last_message": message_data.content,
                    "last_message_at": new_message.created_at,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return new_message

    @staticmethod
    async def get_user_conversations(user_id: str, user_type: str) -> List[ConversationModel]:
        db = get_database()
        cursor = db.conversations.find(
            {"participants": {"$elemMatch": {"id": ObjectId(user_id), "type": user_type}}}
        ).sort("last_message_at", -1)
        
        conversations = await cursor.to_list(length=None)
        return [ConversationModel(**conv) for conv in conversations]

    @staticmethod
    async def get_conversation_messages(conversation_id: str) -> List[MessageModel]:
        db = get_database()
        cursor = db.messages.find({"conversation_id": ObjectId(conversation_id)}).sort("created_at", 1)
        messages = await cursor.to_list(length=None)
        return [MessageModel(**msg) for msg in messages]
