"""Carpool router: CRUD operations, search, and filtering."""

from datetime import datetime, timezone, date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.carpool import CarpoolAd
from app.schemas.carpool import CarpoolAdResponse, CarpoolAdCreate, CarpoolAdUpdate
from app.utils.pagination import paginate

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