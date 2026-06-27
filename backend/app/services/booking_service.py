from datetime import datetime, timedelta
from typing import List, Optional
from bson import ObjectId
from app.config.database import get_database
from app.models.booking import AvailabilityModel, BookingModel
from app.schemas.booking import AvailabilitySet, BookingCreate


def _generate_slots(start_time: str, end_time: str, duration_mins: int) -> List[str]:
    fmt = "%H:%M"
    cur = datetime.strptime(start_time, fmt)
    end = datetime.strptime(end_time, fmt)
    slots: List[str] = []
    while cur + timedelta(minutes=duration_mins) <= end:
        slots.append(cur.strftime(fmt))
        cur += timedelta(minutes=duration_mins)
    return slots


class BookingService:

    @staticmethod
    async def get_availability(business_id: str) -> Optional[AvailabilityModel]:
        db = get_database()
        doc = await db.availability.find_one({"business_id": business_id})
        return AvailabilityModel(**doc) if doc else None

    @staticmethod
    async def set_availability(business_id: str, data: AvailabilitySet) -> AvailabilityModel:
        db = get_database()
        update_doc = {
            "business_id": business_id,
            "schedules": [s.dict() for s in data.schedules],
            "slot_duration": data.slot_duration,
            "is_active": data.is_active,
        }
        await db.availability.update_one(
            {"business_id": business_id},
            {"$set": update_doc},
            upsert=True,
        )
        result = await db.availability.find_one({"business_id": business_id})
        return AvailabilityModel(**result)

    @staticmethod
    async def get_available_slots(business_id: str, date_str: str) -> List[str]:
        db = get_database()
        avail = await BookingService.get_availability(business_id)
        if not avail or not avail.is_active:
            return []

        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            return []

        dow = date_obj.weekday()   # 0=Mon, 6=Sun
        schedule = next((s for s in avail.schedules if s.day == dow and s.is_active), None)
        if not schedule:
            return []

        all_slots = _generate_slots(schedule.start_time, schedule.end_time, avail.slot_duration)

        booked_docs = await db.bookings.find(
            {"business_id": business_id, "date": date_str, "status": {"$in": ["pending", "confirmed"]}}
        ).to_list(length=None)
        booked = {doc["time_slot"] for doc in booked_docs}

        return [s for s in all_slots if s not in booked]

    @staticmethod
    async def create_booking(
        business_id: str,
        business_name: str,
        user_id: str,
        user_name: str,
        user_phone: str,
        data: BookingCreate,
    ) -> Optional[BookingModel]:
        db = get_database()

        available = await BookingService.get_available_slots(business_id, data.date)
        if data.time_slot not in available:
            return None

        doc = {
            "business_id": business_id,
            "business_name": business_name,
            "user_id": user_id,
            "user_name": user_name,
            "user_phone": user_phone,
            "service": data.service,
            "date": data.date,
            "time_slot": data.time_slot,
            "status": "pending",
            "notes": data.notes,
            "created_at": datetime.utcnow(),
        }
        result = await db.bookings.insert_one(doc)
        doc["_id"] = result.inserted_id
        return BookingModel(**doc)

    @staticmethod
    async def get_user_bookings(user_id: str) -> List[BookingModel]:
        db = get_database()
        cursor = db.bookings.find({"user_id": user_id}).sort("date", -1)
        return [BookingModel(**doc) async for doc in cursor]

    @staticmethod
    async def get_business_bookings(business_id: str) -> List[BookingModel]:
        db = get_database()
        cursor = db.bookings.find({"business_id": business_id}).sort(
            [("date", 1), ("time_slot", 1)]
        )
        return [BookingModel(**doc) async for doc in cursor]

    @staticmethod
    async def cancel_booking(booking_id: str, user_id: str) -> bool:
        if not ObjectId.is_valid(booking_id):
            return False
        db = get_database()
        result = await db.bookings.update_one(
            {
                "_id": ObjectId(booking_id),
                "user_id": user_id,
                "status": {"$in": ["pending", "confirmed"]},
            },
            {"$set": {"status": "cancelled"}},
        )
        return result.modified_count > 0

    @staticmethod
    async def update_booking_status(booking_id: str, new_status: str) -> bool:
        if not ObjectId.is_valid(booking_id):
            return False
        db = get_database()

        booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return False

        result = await db.bookings.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": {"status": new_status}},
        )
        if result.modified_count == 0:
            return False

        notif_map = {
            "confirmed": (
                "Booking Confirmed",
                f"Your booking at {booking['business_name']} on {booking['date']} at {booking['time_slot']} is confirmed.",
            ),
            "cancelled": (
                "Booking Cancelled",
                f"Your booking at {booking['business_name']} on {booking['date']} has been cancelled.",
            ),
            "completed": (
                "Visit Complete",
                f"Your visit to {booking['business_name']} is marked complete. Hope you had a great experience!",
            ),
        }
        if new_status in notif_map:
            from app.services.notification_service import NotificationService
            title, body = notif_map[new_status]
            await NotificationService.create_notification(
                user_id=booking["user_id"],
                type=f"booking_{new_status}",
                title=title,
                body=body,
                related_id=booking_id,
            )

        return True
