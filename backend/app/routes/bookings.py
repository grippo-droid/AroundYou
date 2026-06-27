from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.booking import AvailabilitySet, BookingCreate, BookingStatusUpdate
from app.services.booking_service import BookingService
from app.services.business_service import BusinessService
from app.core.dependencies import get_current_user, get_current_business_owner
from app.models.user import UserModel
from app.utils.responses import ResponseModel

router = APIRouter()


@router.get("/business/{business_id}/availability")
async def get_availability(business_id: str):
    avail = await BookingService.get_availability(business_id)
    return ResponseModel.success(data=avail)


@router.post("/business/{business_id}/availability")
async def set_availability(
    business_id: str,
    data: AvailabilitySet,
    current_user: UserModel = Depends(get_current_business_owner),
):
    business = await BusinessService.get_business_by_id(business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if business.owner_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your business")
    avail = await BookingService.set_availability(business_id, data)
    return ResponseModel.success(data=avail, message="Availability updated")


@router.get("/business/{business_id}/slots")
async def get_slots(business_id: str, date: str):
    slots = await BookingService.get_available_slots(business_id, date)
    return ResponseModel.success(data=slots)


@router.post("/business/{business_id}/book", status_code=status.HTTP_201_CREATED)
async def create_booking(
    business_id: str,
    data: BookingCreate,
    current_user: UserModel = Depends(get_current_user),
):
    business = await BusinessService.get_business_by_id(business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    booking = await BookingService.create_booking(
        business_id=business_id,
        business_name=business.name,
        user_id=str(current_user.id),
        user_name=current_user.name,
        user_phone=current_user.phone,
        data=data,
    )
    if booking is None:
        raise HTTPException(status_code=409, detail="This slot is no longer available")
    return ResponseModel.success(data=booking, message="Appointment booked", status_code=201)


@router.get("/my")
async def get_my_bookings(current_user: UserModel = Depends(get_current_user)):
    bookings = await BookingService.get_user_bookings(str(current_user.id))
    return ResponseModel.success(data=bookings)


@router.put("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    ok = await BookingService.cancel_booking(booking_id, str(current_user.id))
    if not ok:
        raise HTTPException(status_code=404, detail="Booking not found or already finalized")
    return ResponseModel.success(message="Booking cancelled")


@router.get("/business/{business_id}/appointments")
async def get_business_appointments(
    business_id: str,
    current_user: UserModel = Depends(get_current_business_owner),
):
    business = await BusinessService.get_business_by_id(business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if business.owner_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your business")
    bookings = await BookingService.get_business_bookings(business_id)
    return ResponseModel.success(data=bookings)


@router.put("/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    data: BookingStatusUpdate,
    current_user: UserModel = Depends(get_current_business_owner),
):
    if data.status not in ("confirmed", "cancelled", "completed"):
        raise HTTPException(status_code=400, detail="Invalid status value")
    ok = await BookingService.update_booking_status(booking_id, data.status)
    if not ok:
        raise HTTPException(status_code=404, detail="Booking not found")
    return ResponseModel.success(message=f"Booking marked as {data.status}")
