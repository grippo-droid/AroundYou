from typing import List, Optional
from bson import ObjectId
from app.config.database import get_database
from app.models.post import PostModel
from app.schemas.post import PostCreate

class PostService:
    @staticmethod
    async def create_post(business_id: str, business_name: str, business_avatar: Optional[str], post_data: PostCreate) -> PostModel:
        db = get_database()
        new_post = PostModel(
            business_id=business_id,
            business_name=business_name,
            business_avatar=business_avatar,
            **post_data.model_dump()
        )
        result = await db.posts.insert_one(new_post.model_dump(by_alias=True, exclude={"id"}))
        new_post.id = result.inserted_id
        return new_post

    @staticmethod
    async def get_posts_by_business(business_id: str) -> List[PostModel]:
        db = get_database()
        cursor = db.posts.find({"business_id": business_id}).sort("created_at", -1)
        posts = await cursor.to_list(length=100)
        return [PostModel(**p) for p in posts]

    @staticmethod
    async def get_all_posts() -> List[PostModel]:
        db = get_database()
        cursor = db.posts.find().sort("created_at", -1)
        posts = await cursor.to_list(length=100)
        return [PostModel(**p) for p in posts]
