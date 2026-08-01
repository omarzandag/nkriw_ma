"""Users router: profile management and public profiles."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.services.storage_service import save_upload_file

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/profile", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's profile."""
    return _build_user_response(current_user, db)


@router.put("/profile", response_model=UserResponse)
def update_my_profile(
    request: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile."""
    # Check username uniqueness if changing
    if request.username and request.username != current_user.username:
        if db.query(User).filter(User.username == request.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return _build_user_response(current_user, db)


@router.post("/profile/picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile picture."""
    image_url = await save_upload_file(file, subdir="profiles")
    current_user.profile_picture = image_url
    db.commit()
    db.refresh(current_user)
    return _build_user_response(current_user, db)


@router.post("/profile/cover", response_model=UserResponse)
async def upload_cover_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a cover picture."""
    image_url = await save_upload_file(file, subdir="covers")
    current_user.cover_picture = image_url
    db.commit()
    db.refresh(current_user)
    return _build_user_response(current_user, db)


@router.get("/{username}", response_model=UserResponse)
def get_public_profile(
    username: str,
    db: Session = Depends(get_db),
):
    """Get a user's public profile by username."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return _build_user_response(user, db)


def _build_user_response(user: User, db: Session) -> UserResponse:
    """Build a UserResponse with computed counts."""
    from app.models.housing import HousingAd
    from app.models.forum import ForumThread
    from app.models.comment import Comment

    housing_count = db.query(HousingAd).filter(HousingAd.user_id == user.id).count()
    forum_count = db.query(ForumThread).filter(ForumThread.user_id == user.id).count()
    comment_count = db.query(Comment).filter(Comment.user_id == user.id).count()

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        profile_picture=user.profile_picture,
        cover_picture=user.cover_picture,
        phone_number=user.phone_number,
        gender=user.gender,
        date_of_birth=user.date_of_birth,
        city=user.city,
        bio=user.bio,
        is_admin=user.is_admin,
        join_date=user.join_date,
        last_active=user.last_active,
        rating=user.rating,
        verification_badge=user.verification_badge,
        housing_ads_count=housing_count,
        forum_posts_count=forum_count,
        comments_count=comment_count,
    )