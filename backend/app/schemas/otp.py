from pydantic import BaseModel, Field


class SendOtpRequest(BaseModel):
    phone: str
    purpose: str = Field(default="login", pattern="^(login|register)$")


class LoginOtpRequest(BaseModel):
    phone: str
    code: str = Field(..., min_length=6, max_length=6)


class RegisterOtpRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    phone: str
    code: str = Field(..., min_length=6, max_length=6)
    role: str = Field(default="user", pattern="^(user|business)$")
