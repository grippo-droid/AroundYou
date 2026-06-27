"""
SMS abstraction layer.

Set SMS_PROVIDER in .env:
  console  (default) — prints OTP to server logs, no API keys needed
  msg91    — MSG91 OTP API (preferred for India)
  twilio   — Twilio Programmable Messaging
"""

import base64
import httpx
from app.config.settings import settings


async def send_otp_sms(phone: str, otp: str) -> bool:
    provider = getattr(settings, "SMS_PROVIDER", "console")

    if provider == "msg91":
        return await _msg91(phone, otp)
    if provider == "twilio":
        message = f"Your NearMe OTP is {otp}. Valid for 10 minutes. Do not share."
        return await _twilio(phone, message)

    # ── console / development fallback ────────────────────────────────────────
    border = "─" * 44
    print(f"\n{border}")
    print(f"  NearMe OTP  │  phone: {phone}  │  code: {otp}")
    print(f"{border}\n")
    return True


async def _msg91(phone: str, otp: str) -> bool:
    """MSG91 OTP API v5 — https://docs.msg91.com/p/OTP-API"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.msg91.com/api/v5/otp",
                params={
                    "authkey": settings.MSG91_API_KEY,
                    "mobile": phone,
                    "template_id": settings.MSG91_TEMPLATE_ID,
                    "otp": otp,
                },
            )
        return resp.status_code == 200
    except Exception as exc:
        print(f"[SMS] MSG91 error: {exc}")
        return False


async def _twilio(phone: str, message: str) -> bool:
    """Twilio Programmable Messaging — https://www.twilio.com/docs/sms"""
    try:
        creds = f"{settings.TWILIO_ACCOUNT_SID}:{settings.TWILIO_AUTH_TOKEN}"
        auth_header = base64.b64encode(creds.encode()).decode()
        url = (
            f"https://api.twilio.com/2010-04-01/Accounts/"
            f"{settings.TWILIO_ACCOUNT_SID}/Messages.json"
        )
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Basic {auth_header}"},
                data={
                    "From": settings.TWILIO_PHONE_NUMBER,
                    "To": phone,
                    "Body": message,
                },
            )
        return resp.status_code == 201
    except Exception as exc:
        print(f"[SMS] Twilio error: {exc}")
        return False
