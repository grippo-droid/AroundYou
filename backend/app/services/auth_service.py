from datetime import timedelta
from fastapi import HTTPException, status
from app.config.database import get_database
from app.core.security import verify_password, get_password_hash
from app.core.jwt import create_access_token
from app.schemas.user import UserLogin, UserCreate
from app.schemas.otp import RegisterOtpRequest
from app.models.user import UserModel
from app.config.settings import settings

class AuthService:
    @staticmethod
    async def authenticate_user(login_data: UserLogin) -> str:
        db = get_database()
        user = await db.users.find_one({"phone": login_data.phone})
        if not user:
            raise HTTPException(status_code=400, detail="Incorrect phone or password")
        
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Incorrect phone or password")
        
        access_token_expires = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user["_id"]), "role": user["role"]},
            expires_delta=access_token_expires
        )
        return access_token

    @staticmethod
    def _make_token(user_id, role: str) -> str:
        return create_access_token(
            data={"sub": str(user_id), "role": role},
            expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
        )

    @staticmethod
    async def login_with_otp(phone: str) -> str:
        """Return a JWT for an existing user identified by phone (OTP already verified)."""
        db = get_database()
        user = await db.users.find_one({"phone": phone})
        if not user:
            raise HTTPException(status_code=404, detail="No account found for this number — please register first")
        return AuthService._make_token(user["_id"], user["role"])

    @staticmethod
    async def register_with_otp(data: RegisterOtpRequest) -> tuple[UserModel, str]:
        """Create a verified user and return (user, token). Phone uniqueness assumed pre-checked."""
        db = get_database()
        # Set a random unusable password hash so password login is blocked for OTP accounts
        import secrets
        random_pwd = get_password_hash(secrets.token_hex(32))
        new_user = UserModel(
            name=data.name,
            phone=data.phone,
            password_hash=random_pwd,
            role=data.role,
            is_verified=True,
        )
        result = await db.users.insert_one(new_user.model_dump(by_alias=True, exclude={"id"}))
        new_user.id = result.inserted_id
        token = AuthService._make_token(result.inserted_id, data.role)
        return new_user, token

    @staticmethod
    async def create_user(user_data: UserCreate) -> UserModel:
        db = get_database()
        if await db.users.find_one({"phone": user_data.phone}):
            raise HTTPException(status_code=400, detail="Phone number already registered")
        
        if user_data.email and await db.users.find_one({"email": user_data.email}):
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_password = get_password_hash(user_data.password)
        new_user = UserModel(
            name=user_data.name,
            email=user_data.email,
            phone=user_data.phone,
            password_hash=hashed_password,
            role=user_data.role
        )
        
        result = await db.users.insert_one(new_user.model_dump(by_alias=True, exclude={"id"}))
        new_user.id = result.inserted_id
        return new_user
