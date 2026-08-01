"""Co-location router: CRUD operations, search, and filtering."""

from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.colocation import ColocationAd, ColocationImage
from app.schemas.colocation import ColocationAdResponse, ColocationAdCreate, ColocationAdUpdate
from app.utils.pagination import paginate
from app.services.storage_service import save_upload_file

router = APIRouter(prefix="/api/colocation", tags=["Co-location"])


@router.get("", response_model=dict)
def list_colocation_ads(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    city: str | None = None,
    neighborhood: str | None = None,
    preferred_gender: str | None = None,
    min_rent: float | None = Query(None, ge=0),
    max_rent: float | None = Query(None, ge=0),
    student_only: bool | None = None,
    working_professional_only: bool | None = None,
    smoking_allowed: bool | None = None,
    pets_allowed: bool | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
):
    """List co-location advertisements with optional filtering and search."""
    query = db.query(ColocationAd)

    if city:
        query = query.filter(ColocationAd.city.ilike(f"%{city}%"))
    if neighborhood:
        query = query.filter(ColocationAd.neighborhood.ilike(f"%{neighborhood}%"))
    if preferred_gender:
        query = query.filter(ColocationAd.preferred_gender == preferred_gender)
    if min_rent is not None:
        query = query.filter(ColocationAd.monthly_rent >= min_rent)
    if max_rent is not None:
        query = query.filter(ColocationAd.monthly_rent <= max_rent)
    if student_only is not None:
        query = query.filter(ColocationAd.student_only == student_only)
    if working_professional_only is not None:
        query = query.filter(ColocationAd.working_professional_only == working_professional_only)
    if smoking_allowed is not None:
        query = query.filter(ColocationAd.smoking_allowed == smoking_allowed)
    if pets_allowed is not None:
        query = query.filter(ColocationAd.pets_allowed == pets_allowed)
    if keyword:
        query = query.filter(
            (ColocationAd.title.ilike(f"%{keyword}%")) |
            (ColocationAd.description.ilike(f"%{keyword}%"))
        )

    query = query.order_by(ColocationAd.publication_date.desc())
    items, total, pages = paginate(query, page, per_page)

    return {
        "items": [ColocationAdResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": per_page,
    }


@router.get("/{ad_id}", response_model=ColocationAdResponse)
def get_colocation_ad(ad_id: UUID, db: Session = Depends(get_db)):
    """Get a single co-location advertisement by ID."""
    ad = db.query(ColocationAd).filter(ColocationAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Co-location ad not found")

    ad.views = (ad.views or 0) + 1
    db.commit()
    db.refresh(ad)

    # Build response with author info
    response = ColocationAdResponse.model_validate(ad).model_dump()
    author = db.query(User).filter(User.id == ad.user_id).first()
    response["author_username"] = author.username if author else None
    response["author_profile_picture"] = author.profile_picture if author else None
    return response


@router.post("", response_model=ColocationAdResponse, status_code=status.HTTP_201_CREATED)
def create_colocation_ad(
    request: ColocationAdCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new co-location advertisement."""
    ad = ColocationAd(
        user_id=current_user.id,
        **request.model_dump(),
    )
    db.add(ad)
    db.commit()
    db.refresh(ad)
    return ColocationAdResponse.model_validate(ad)


@router.put("/{ad_id}", response_model=ColocationAdResponse)
def update_colocation_ad(
    ad_id: UUID,
    request: ColocationAdUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a co-location advertisement (owner or admin only)."""
    ad = db.query(ColocationAd).filter(ColocationAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Co-location ad not found")

    if ad.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ad, field, value)

    ad.last_update = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ad)
    return ColocationAdResponse.model_validate(ad)


@router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_colocation_ad(
    ad_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a co-location advertisement (owner or admin only)."""
    ad = db.query(ColocationAd).filter(ColocationAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Co-location ad not found")

    if ad.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(ad)
    db.commit()
    return None


@router.post("/{ad_id}/mark-found", response_model=ColocationAdResponse)
def mark_as_found(
    ad_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a co-location advertisement as found (roommate found)."""
    ad = db.query(ColocationAd).filter(ColocationAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Co-location ad not found")

    if ad.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    ad.status = "found"
    db.commit()
    db.refresh(ad)
    return ColocationAdResponse.model_validate(ad)


@router.post("/{ad_id}/images", response_model=ColocationAdResponse)
async def upload_colocation_images(
    ad_id: UUID,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload images for a co-location advertisement."""
    ad = db.query(ColocationAd).filter(ColocationAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Co-location ad not found")

    if ad.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    for file in files:
        image_url = await save_upload_file(file, subdir="colocation")
        image = ColocationImage(colocation_id=ad.id, image_url=image_url)
        db.add(image)

    db.commit()
    db.refresh(ad)
    return ColocationAdResponse.model_validate(ad)


@router.get("/my/ads", response_model=dict)
def get_my_colocation_ads(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's co-location advertisements."""
    query = db.query(ColocationAd).filter(ColocationAd.user_id == current_user.id)
    query = query.order_by(ColocationAd.publication_date.desc())
    items, total, pages = paginate(query, page, per_page)
    return {
        "items": [ColocationAdResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": per_page,
    }