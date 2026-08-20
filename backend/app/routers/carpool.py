"""Carpool router: CRUD operations, search, and filtering."""

from datetime import datetime, timezone, date, time
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.carpool import CarpoolAd, CarpoolBooking
from app.models.messaging import Conversation, Message
from app.schemas.carpool import (
    CarpoolAdResponse, CarpoolAdCreate, CarpoolAdUpdate,
    CarpoolBookingCreate, CarpoolBookingResponse
)
from app.utils.pagination import paginate
from app.services.notification_service import create_notification


# ---------------------------------------------------------------------------
# Helpers: multilingual notification strings
# ---------------------------------------------------------------------------

def _lang(request: Request) -> str:
    """Read the preferred language from the Accept-Language header (fr/en/ar)."""
    raw = request.headers.get("Accept-Language", "fr")
    lang = raw.split(",")[0].split("-")[0].strip().lower()
    return lang if lang in ("fr", "en", "ar") else "fr"


_NOTIF = {
    "new_booking_request": {
        "fr": {
            "title": "Nouvelle demande de covoiturage 🚗",
            "body": "{passenger} a demandé {seats} place(s) pour votre trajet {from_city} → {to_city}.",
        },
        "en": {
            "title": "New carpool booking request 🚗",
            "body": "{passenger} requested {seats} seat(s) on your trip {from_city} → {to_city}.",
        },
        "ar": {
            "title": "طلب حجز جديد 🚗",
            "body": "طلب {passenger} {seats} مقعد(في) في رحلتك {from_city} → {to_city}.",
        },
    },
    "booking_accepted": {
        "fr": {
            "title": "Réservation acceptée ! 🎉",
            "body": "Votre réservation de {seats} place(s) pour le trajet {from_city} → {to_city} a été acceptée par {driver}.",
        },
        "en": {
            "title": "Booking accepted! 🎉",
            "body": "Your booking of {seats} seat(s) for {from_city} → {to_city} was accepted by {driver}.",
        },
        "ar": {
            "title": "تم قبول الحجز! 🎉",
            "body": "تم قبول حجزك لـ {seats} مقعد(في) في رحلة {from_city} → {to_city} من قبل {driver}.",
        },
    },
    "booking_rejected": {
        "fr": {
            "title": "Réservation refusée",
            "body": "Votre demande pour le trajet {from_city} → {to_city} a été refusée par {driver}.",
        },
        "en": {
            "title": "Booking declined",
            "body": "Your request for {from_city} → {to_city} was declined by {driver}.",
        },
        "ar": {
            "title": "تم رفض الحجز",
            "body": "تم رفض طلبك لرحلة {from_city} → {to_city} من قبل {driver}.",
        },
    },
    "booking_cancelled": {
        "fr": {
            "title": "Réservation annulée",
            "body": "{passenger} a annulé sa réservation de {seats} place(s) pour votre trajet {from_city} → {to_city}.",
        },
        "en": {
            "title": "Booking cancelled",
            "body": "{passenger} cancelled their {seats} seat booking on your trip {from_city} → {to_city}.",
        },
        "ar": {
            "title": "إلغاء الحجز",
            "body": "ألغى {passenger} حجزه لـ {seats} مقعد(في) في رحلتك {from_city} → {to_city}.",
        },
    },
}


_DM_ACCEPTED = {
    "fr": "🎉 Bonne nouvelle ! Votre demande de covoiturage de {from_city} → {to_city} a été acceptée. Bon voyage !",
    "en": "🎉 Great news! Your carpool request for {from_city} → {to_city} has been accepted. Have a great trip!",
    "ar": "🎉 أخبار رائعة! تم قبول طلب السيارة المشتركة لـ {from_city} → {to_city}. رحلة سعيدة!",
}


def _notif_text(key: str, lang: str, **kwargs) -> tuple[str, str]:
    """Return (title, body) for the given notification key and language."""
    tmpl = _NOTIF[key].get(lang, _NOTIF[key]["fr"])
    return tmpl["title"], tmpl["body"].format(**kwargs)


def _send_dm(db: Session, sender: User, receiver_id: UUID, content: str) -> None:
    """Find-or-create a conversation and send a message from sender to receiver."""
    conv = db.query(Conversation).filter(
        or_(
            and_(Conversation.user1_id == sender.id, Conversation.user2_id == receiver_id),
            and_(Conversation.user1_id == receiver_id, Conversation.user2_id == sender.id),
        )
    ).first()
    if not conv:
        conv = Conversation(user1_id=sender.id, user2_id=receiver_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)
    if conv.blocked_by is not None:
        return  # silently skip if blocked
    msg = Message(
        conversation_id=conv.id,
        sender_id=sender.id,
        receiver_id=receiver_id,
        content=content,
    )
    db.add(msg)
    conv.last_message_at = datetime.now(timezone.utc)
    db.commit()

router = APIRouter(prefix="/api/carpool", tags=["Carpool"])


@router.get("", response_model=dict)
def list_carpool_ads(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    departure_city: str | None = None,
    destination_city: str | None = None,
    departure_date: date | None = None,
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    available_seats: int | None = Query(None, ge=1),
    keyword: str | None = None,
    db: Session = Depends(get_db),
):
    """List carpool advertisements with optional filtering and search."""
    query = db.query(CarpoolAd)

    if departure_city:
        query = query.filter(CarpoolAd.departure_city.ilike(f"%{departure_city}%"))
    if destination_city:
        query = query.filter(CarpoolAd.destination_city.ilike(f"%{destination_city}%"))
    if departure_date:
        query = query.filter(CarpoolAd.departure_date >= departure_date)
    if min_price is not None:
        query = query.filter(CarpoolAd.price_per_passenger >= min_price)
    if max_price is not None:
        query = query.filter(CarpoolAd.price_per_passenger <= max_price)
    if available_seats is not None:
        query = query.filter(CarpoolAd.available_seats >= available_seats)
    if keyword:
        query = query.filter(
            (CarpoolAd.departure_city.ilike(f"%{keyword}%")) |
            (CarpoolAd.destination_city.ilike(f"%{keyword}%")) |
            (CarpoolAd.additional_info.ilike(f"%{keyword}%"))
        )

    query = query.order_by(CarpoolAd.departure_date.asc())
    items, total, pages = paginate(query, page, per_page)

    return {
        "items": [CarpoolAdResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": per_page,
    }


@router.get("/{ad_id}", response_model=CarpoolAdResponse)
def get_carpool_ad(ad_id: UUID, db: Session = Depends(get_db)):
    """Get a single carpool advertisement by ID."""
    ad = db.query(CarpoolAd).filter(CarpoolAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpool ad not found")

    ad.views = (ad.views or 0) + 1
    db.commit()
    db.refresh(ad)

    # Build response with author info
    response = CarpoolAdResponse.model_validate(ad).model_dump()
    author = db.query(User).filter(User.id == ad.user_id).first()
    response["author_username"] = author.username if author else None
    response["author_profile_picture"] = author.profile_picture if author else None
    return response


@router.post("", response_model=CarpoolAdResponse, status_code=status.HTTP_201_CREATED)
def create_carpool_ad(
    request: CarpoolAdCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new carpool advertisement."""
    ad = CarpoolAd(
        user_id=current_user.id,
        **request.model_dump(),
    )
    db.add(ad)
    db.commit()
    db.refresh(ad)
    return CarpoolAdResponse.model_validate(ad)


@router.put("/{ad_id}", response_model=CarpoolAdResponse)
def update_carpool_ad(
    ad_id: UUID,
    request: CarpoolAdUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a carpool advertisement (owner or admin only)."""
    ad = db.query(CarpoolAd).filter(CarpoolAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpool ad not found")

    if ad.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ad, field, value)

    ad.last_update = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ad)
    return CarpoolAdResponse.model_validate(ad)


@router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_carpool_ad(
    ad_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a carpool advertisement (owner or admin only)."""
    ad = db.query(CarpoolAd).filter(CarpoolAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpool ad not found")

    if ad.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(ad)
    db.commit()
    return None


@router.post("/{ad_id}/mark-completed", response_model=CarpoolAdResponse)
def mark_as_completed(
    ad_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a carpool trip as completed."""
    ad = db.query(CarpoolAd).filter(CarpoolAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpool ad not found")

    if ad.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    ad.status = "completed"
    db.commit()
    db.refresh(ad)
    return CarpoolAdResponse.model_validate(ad)


@router.get("/my/ads", response_model=dict)
def get_my_carpool_ads(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's carpool advertisements."""
    query = db.query(CarpoolAd).filter(CarpoolAd.user_id == current_user.id)
    query = query.order_by(CarpoolAd.departure_date.desc())
    items, total, pages = paginate(query, page, per_page)
    return {
        "items": [CarpoolAdResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": per_page,
    }


def enhance_booking_response(booking, dbSession):
    res_dict = CarpoolBookingResponse.model_validate(booking).model_dump()
    passenger = dbSession.query(User).filter(User.id == booking.passenger_id).first()
    if passenger:
        res_dict["passenger_username"] = passenger.username
        res_dict["passenger_profile_picture"] = passenger.profile_picture
        res_dict["passenger_full_name"] = passenger.full_name

    ad = dbSession.query(CarpoolAd).filter(CarpoolAd.id == booking.carpool_ad_id).first()
    if ad:
        res_dict["departure_city"] = ad.departure_city
        res_dict["destination_city"] = ad.destination_city
        res_dict["departure_date"] = ad.departure_date
        res_dict["departure_time"] = ad.departure_time
        res_dict["price_per_passenger"] = ad.price_per_passenger
        # get driver username
        driver = dbSession.query(User).filter(User.id == ad.user_id).first()
        if driver:
            res_dict["driver_username"] = driver.username
            
    return res_dict


# Booking operations

@router.get("/bookings/my/reservations", response_model=list[CarpoolBookingResponse])
def get_my_reservations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's passenger bookings (submitted requests)."""
    bookings = db.query(CarpoolBooking).filter(
        CarpoolBooking.passenger_id == current_user.id
    ).order_by(CarpoolBooking.created_at.desc()).all()
    return [enhance_booking_response(b, db) for b in bookings]


@router.get("/bookings/my/requests", response_model=list[CarpoolBookingResponse])
def get_my_incoming_booking_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List bookings requested for the current user's driver listings."""
    bookings = db.query(CarpoolBooking).join(CarpoolAd).filter(
        CarpoolAd.user_id == current_user.id
    ).order_by(CarpoolBooking.created_at.desc()).all()
    return [enhance_booking_response(b, db) for b in bookings]


@router.post("/{ad_id}/bookings", response_model=CarpoolBookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    ad_id: UUID,
    booking_data: CarpoolBookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Request/book seats inside a carpool ad."""
    ad = db.query(CarpoolAd).filter(CarpoolAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Carpool ad not found")
    
    if ad.status != "active":
        raise HTTPException(status_code=400, detail="This carpool ad is no longer active")
        
    if ad.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot book your own carpool")

    # Check if passenger has already booked
    existing = db.query(CarpoolBooking).filter(
        CarpoolBooking.carpool_ad_id == ad_id,
        CarpoolBooking.passenger_id == current_user.id,
        CarpoolBooking.status.in_(["pending", "accepted"])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active booking request for this trip")

    if ad.available_seats < booking_data.seats_requested:
        raise HTTPException(status_code=400, detail=f"Only {ad.available_seats} seats are available")

    booking = CarpoolBooking(
        carpool_ad_id=ad_id,
        passenger_id=current_user.id,
        seats_requested=booking_data.seats_requested,
        status="pending"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Create notification for driver (language = driver's browser language; default fr)
    title, body = _notif_text(
        "new_booking_request", "fr",
        passenger=current_user.full_name or current_user.username,
        seats=booking_data.seats_requested,
        from_city=ad.departure_city,
        to_city=ad.destination_city,
    )
    create_notification(
        db=db,
        user_id=ad.user_id,
        type="new_booking_request",
        title=title,
        body=body,
        link=f"/carpool/{ad_id}",
    )

    return enhance_booking_response(booking, db)


@router.get("/{ad_id}/bookings", response_model=list[CarpoolBookingResponse])
def get_ad_bookings(
    ad_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List bookings under a single carpool trip (Owner only)."""
    ad = db.query(CarpoolAd).filter(CarpoolAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Carpool ad not found")

    if ad.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view bookings for this trip")

    bookings = db.query(CarpoolBooking).filter(CarpoolBooking.carpool_ad_id == ad_id).all()
    return [enhance_booking_response(b, db) for b in bookings]


@router.post("/bookings/{booking_id}/accept", response_model=CarpoolBookingResponse)
def accept_booking(
    booking_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept booking / decrement seats (Owner only)."""
    booking = db.query(CarpoolBooking).filter(CarpoolBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    ad = db.query(CarpoolAd).filter(CarpoolAd.id == booking.carpool_ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Associated carpool ad not found")

    if ad.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    if booking.status != "pending":
        raise HTTPException(status_code=400, detail=f"Booking is not pending (current status: {booking.status})")

    if ad.available_seats < booking.seats_requested:
        raise HTTPException(status_code=400, detail="Not enough available seats left on this trip")

    booking.status = "accepted"
    ad.available_seats -= booking.seats_requested

    db.commit()
    db.refresh(booking)
    db.refresh(ad)

    lang = _lang(request)
    driver_name = current_user.full_name or current_user.username

    # Notify passenger (in their app language)
    title, body = _notif_text(
        "booking_accepted", lang,
        seats=booking.seats_requested,
        from_city=ad.departure_city,
        to_city=ad.destination_city,
        driver=driver_name,
    )
    create_notification(
        db=db,
        user_id=booking.passenger_id,
        type="booking_accepted",
        title=title,
        body=body,
        link=f"/carpool/{ad.id}",
    )

    # Auto-send DM from driver to passenger
    dm_text = _DM_ACCEPTED.get(lang, _DM_ACCEPTED["fr"]).format(
        from_city=ad.departure_city,
        to_city=ad.destination_city,
    )
    _send_dm(db, sender=current_user, receiver_id=booking.passenger_id, content=dm_text)

    return enhance_booking_response(booking, db)


@router.post("/bookings/{booking_id}/reject", response_model=CarpoolBookingResponse)
def reject_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject booking request (Owner only)."""
    booking = db.query(CarpoolBooking).filter(CarpoolBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    ad = db.query(CarpoolAd).filter(CarpoolAd.id == booking.carpool_ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Associated carpool ad not found")

    if ad.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    if booking.status != "pending":
        raise HTTPException(status_code=400, detail=f"Booking is not pending (current status: {booking.status})")

    booking.status = "rejected"
    db.commit()
    db.refresh(booking)

    # Notify passenger
    driver_name = current_user.full_name or current_user.username
    title, body = _notif_text(
        "booking_rejected", "fr",
        from_city=ad.departure_city,
        to_city=ad.destination_city,
        driver=driver_name,
    )
    create_notification(
        db=db,
        user_id=booking.passenger_id,
        type="booking_rejected",
        title=title,
        body=body,
        link=f"/carpool/{ad.id}",
    )

    return enhance_booking_response(booking, db)


@router.post("/bookings/{booking_id}/cancel", response_model=CarpoolBookingResponse)
def cancel_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel booking (Passenger only)."""
    booking = db.query(CarpoolBooking).filter(CarpoolBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.passenger_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    if booking.status not in ["pending", "accepted"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel a booking in '{booking.status}' status")

    ad = db.query(CarpoolAd).filter(CarpoolAd.id == booking.carpool_ad_id).first()
    if not ad:
         raise HTTPException(status_code=404, detail="Associated carpool ad not found")

    # If it was already accepted, restore the seats!
    if booking.status == "accepted":
        ad.available_seats += booking.seats_requested

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    db.refresh(ad)

    # Notify the driver
    passenger_name = current_user.full_name or current_user.username
    title, body = _notif_text(
        "booking_cancelled", "fr",
        passenger=passenger_name,
        seats=booking.seats_requested,
        from_city=ad.departure_city,
        to_city=ad.destination_city,
    )
    create_notification(
        db=db,
        user_id=ad.user_id,
        type="booking_cancelled",
        title=title,
        body=body,
        link=f"/carpool/{ad.id}",
    )

    return enhance_booking_response(booking, db)