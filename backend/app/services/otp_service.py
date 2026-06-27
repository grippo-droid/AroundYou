import random
import string
from datetime import datetime, timedelta
from typing import Optional

from app.config.database import get_database

OTP_EXPIRE_MINUTES = 10
RATE_LIMIT_SECONDS = 60
MAX_ATTEMPTS = 3


class OtpService:

    @staticmethod
    def _generate() -> str:
        return "".join(random.choices(string.digits, k=6))

    @staticmethod
    async def send(phone: str, purpose: str) -> tuple[bool, str]:
        """
        Generate and store an OTP.
        Returns (ok, otp_code) — ok=False when rate-limited.
        The caller is responsible for delivering the code via SMS.
        """
        db = get_database()

        # Rate limit: refuse if a recent OTP already exists
        cutoff = datetime.utcnow() - timedelta(seconds=RATE_LIMIT_SECONDS)
        recent = await db.otp_store.find_one({
            "phone": phone,
            "purpose": purpose,
            "created_at": {"$gt": cutoff},
        })
        if recent:
            return False, ""

        # Remove any stale OTPs for this phone+purpose
        await db.otp_store.delete_many({"phone": phone, "purpose": purpose})

        code = OtpService._generate()
        await db.otp_store.insert_one({
            "phone": phone,
            "purpose": purpose,
            "code": code,
            "expires_at": datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES),
            "attempts": 0,
            "created_at": datetime.utcnow(),
        })
        return True, code

    @staticmethod
    async def verify(phone: str, code: str, purpose: str) -> tuple[bool, str]:
        """
        Verify an OTP.
        Returns (valid, error_message).
        Deletes the record on success or after max attempts.
        """
        db = get_database()
        doc = await db.otp_store.find_one({"phone": phone, "purpose": purpose})

        if not doc:
            return False, "OTP not found — request a new one"

        if datetime.utcnow() > doc["expires_at"]:
            await db.otp_store.delete_one({"_id": doc["_id"]})
            return False, "OTP has expired — request a new one"

        if doc["attempts"] >= MAX_ATTEMPTS:
            await db.otp_store.delete_one({"_id": doc["_id"]})
            return False, "Too many incorrect attempts — request a new OTP"

        if doc["code"] != code:
            await db.otp_store.update_one(
                {"_id": doc["_id"]},
                {"$inc": {"attempts": 1}},
            )
            remaining = MAX_ATTEMPTS - doc["attempts"] - 1
            return False, f"Incorrect OTP — {remaining} attempt(s) remaining"

        # Correct — consume it
        await db.otp_store.delete_one({"_id": doc["_id"]})
        return True, ""
