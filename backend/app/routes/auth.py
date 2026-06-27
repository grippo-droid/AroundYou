from fastapi import APIRouter, Response, status, Depends, HTTPException
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.schemas.otp import SendOtpRequest, LoginOtpRequest, RegisterOtpRequest
from app.services.auth_service import AuthService
from app.services.otp_service import OtpService
from app.services.sms_service import send_otp_sms
from app.core.dependencies import get_current_user
from app.models.user import UserModel
from app.config.settings import settings
from app.utils.responses import ResponseModel
from app.config.database import get_database

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    new_user = await AuthService.create_user(user_data)
    return ResponseModel.success(data=new_user, message="User registered successfully")

@router.post("/login")
async def login(response: Response, login_data: UserLogin):
    token = await AuthService.authenticate_user(login_data)
    _set_auth_cookie(response, token)
    return ResponseModel.success(data={"access_token": token, "token_type": "bearer"}, message="Login successful")

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.COOKIE_NAME)
    return ResponseModel.success(message="Logged out successfully")

def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
        expires=settings.JWT_EXPIRE_MINUTES * 60,
        secure=True,
        samesite="none",
    )


@router.post("/send-otp")
async def send_otp(body: SendOtpRequest):
    db = get_database()
    phone = body.phone.replace(" ", "").strip()

    if body.purpose == "register":
        if await db.users.find_one({"phone": phone}):
            raise HTTPException(status_code=409, detail="Phone already registered — please login")
    elif body.purpose == "login":
        if not await db.users.find_one({"phone": phone}):
            raise HTTPException(status_code=404, detail="No account with this number — please register")

    ok, code = await OtpService.send(phone, body.purpose)
    if not ok:
        raise HTTPException(
            status_code=429,
            detail="OTP already sent — please wait 60 seconds before requesting again",
        )

    sms_ok = await send_otp_sms(phone, code)
    if not sms_ok:
        raise HTTPException(status_code=503, detail="SMS delivery failed — please try again")

    return ResponseModel.success(message=f"OTP sent to {phone}")


@router.post("/login-otp")
async def login_with_otp(response: Response, body: LoginOtpRequest):
    phone = body.phone.replace(" ", "").strip()
    valid, err = await OtpService.verify(phone, body.code, "login")
    if not valid:
        raise HTTPException(status_code=400, detail=err)

    token = await AuthService.login_with_otp(phone)
    _set_auth_cookie(response, token)
    return ResponseModel.success(data={"access_token": token, "token_type": "bearer"}, message="Login successful")


@router.post("/register-otp", status_code=status.HTTP_201_CREATED)
async def register_with_otp(response: Response, body: RegisterOtpRequest):
    phone = body.phone.replace(" ", "").strip()

    # Verify OTP
    valid, err = await OtpService.verify(phone, body.code, "register")
    if not valid:
        raise HTTPException(status_code=400, detail=err)

    # Double-check uniqueness (race-condition guard)
    db = get_database()
    if await db.users.find_one({"phone": phone}):
        raise HTTPException(status_code=409, detail="Phone already registered")

    body.phone = phone
    user, token = await AuthService.register_with_otp(body)
    _set_auth_cookie(response, token)
    return ResponseModel.success(
        data={"access_token": token, "token_type": "bearer"},
        message="Account created successfully",
        status_code=201,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserModel = Depends(get_current_user)):
    user_dict = current_user.model_dump(by_alias=True)
    user_dict["followers_count"] = len(current_user.followers)
    user_dict["following_count"] = len(current_user.following)
    
    # Calculate business count
    from app.config.database import get_database
    from bson import ObjectId
    db = get_database()
    businesses_count = await db.businesses.count_documents({"owner_id": str(current_user.id)})
    user_dict["businesses_count"] = businesses_count

    # Ensure ObjectId conversion via Pydantic
    return ResponseModel.success(data=UserResponse(**user_dict))
