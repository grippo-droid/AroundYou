from typing import Optional
from bson import ObjectId
from app.config.database import get_database
from app.models.user import UserModel
from app.schemas.user import UserUpdate

class UserService:
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[UserModel]:
        db = get_database()
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if user_doc:
            return UserModel(**user_doc)
        return None

    @staticmethod
    async def update_user(user_id: str, update_data: UserUpdate) -> Optional[UserModel]:
        db = get_database()
        update_dict = update_data.model_dump(exclude_unset=True)
        if not update_dict:
            return await UserService.get_user_by_id(user_id)

        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_dict}
        )
        return await UserService.get_user_by_id(user_id)

    @staticmethod
    async def get_user_profile(user_id: str) -> Optional[dict]:
        db = get_database()
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return None
        
        # Calculate stats
        followers_count = len(user_doc.get("followers", []))
        following_count = len(user_doc.get("following", []))
        businesses_count = await db.businesses.count_documents({"owner_id": str(user_id)})
        
        return {
            **user_doc,
            "followers_count": followers_count,
            "following_count": following_count,
            "businesses_count": businesses_count
        }

    @staticmethod
    async def follow_user(follower_id: str, target_id: str) -> bool:
        if follower_id == target_id:
            return False
            
        db = get_database()
        
        # Check if target exists
        target = await db.users.find_one({"_id": ObjectId(target_id)})
        if not target:
            return False
            
        # Add to following list of follower
        await db.users.update_one(
            {"_id": ObjectId(follower_id)},
            {"$addToSet": {"following": target_id}}
        )
        
        # Add to followers list of target
        await db.users.update_one(
            {"_id": ObjectId(target_id)},
            {"$addToSet": {"followers": follower_id}}
        )
        
        return True

    @staticmethod
    async def unfollow_user(follower_id: str, target_id: str) -> bool:
        db = get_database()
        
        # Remove from following list of follower
        await db.users.update_one(
            {"_id": ObjectId(follower_id)},
            {"$pull": {"following": target_id}}
        )
        
        # Remove from followers list of target
        await db.users.update_one(
            {"_id": ObjectId(target_id)},
            {"$pull": {"followers": follower_id}}
        )
        
        return True

    @staticmethod
    async def get_user_businesses(user_id: str):
        db = get_database()
        cursor = db.businesses.find({"owner_id": str(user_id)})
        return await cursor.to_list(length=None)

    @staticmethod
    async def search_users(query: str):
        db = get_database()
        # Case-insensitive regex search
        cursor = db.users.find({"name": {"$regex": query, "$options": "i"}}).limit(20)
        return await cursor.to_list(length=None)

    @staticmethod
    async def toggle_bookmark(user_id: str, business_id: str) -> bool:
        db = get_database()
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return False

        bookmarks = user_doc.get("bookmarked_businesses", [])
        if business_id in bookmarks:
            # Remove
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$pull": {"bookmarked_businesses": business_id}}
            )
        else:
            # Add
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$addToSet": {"bookmarked_businesses": business_id}}
            )
        return True

    @staticmethod
    async def get_bookmarked_businesses(user_id: str):
        db = get_database()
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return []

        bookmarks = user_doc.get("bookmarked_businesses", [])
        if not bookmarks:
            return []

        # Find all businesses in the user's bookmarks list
        # We need to map string IDs to ObjectIds if businesses use ObjectIds as _id
        business_object_ids = []
        for b_id in bookmarks:
            try:
                business_object_ids.append(ObjectId(b_id))
            except:
                pass
                
        cursor = db.businesses.find({"_id": {"$in": business_object_ids}})
        return await cursor.to_list(length=None)
