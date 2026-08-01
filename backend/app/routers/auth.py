"""Authentication router: register, login, logout, password reset."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
)
from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    Token,
    LoginRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if email already exists
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check if username already exists
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    # Create user
    user = User(
        email=request.email,
        username=request.username,
        full_name=request.full_name,
        hashed_password=get_password_hash(request.password),
        phone_number=request.phone_number,
        city=request.city,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate token
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=access_token,
        user_id=str(user.id),
        username=user.username,
        is_admin=user.is_admin,
    )


@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login a user and return a JWT token."""
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )

    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been banned",
        )

    # Update last active
    user.last_active = datetime.now(timezone.utc)
    db.commit()

    # Token expiry based on remember_me
    expires_delta = None
    if not request.remember_me:
        expires_delta = timedelta(hours=24)

    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=expires_delta)
    return Token(
        access_token=access_token,
        user_id=str(user.id),
        username=user.username,
        is_admin=user.is_admin,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current authenticated user's profile."""
    return _build_user_response(current_user, db)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logout the current user.

    With JWT, logout is handled client-side by removing the token.
    This endpoint confirms the user was authenticated.
    """
    return {"message": "Successfully logged out"}


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset token."""
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal that the email doesn't exist
        return {"message": "If the email exists, a reset link has been sent"}

    # Generate reset token
    reset_token = create_access_token(
        data={"sub": str(user.id), "purpose": "reset"},
        expires_delta=timedelta(hours=1),
    )
    user.reset_token = reset_token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    # In production, send email with reset link
    # For now, return the token (in production this would be sent via email)
    return {
        "message": "If the email exists, a reset link has been sent",
        "reset_token": reset_token,  # Remove in production - only for development
    }


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a reset token."""
    payload = decode_access_token(request.token)
    if not payload or payload.get("purpose") != "reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found",
        )

    user.hashed_password = get_password_hash(request.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password has been reset successfully"}


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password for the authenticated user."""
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = get_password_hash(request.new_password)
    db.commit()

    return {"message": "Password changed successfully"}


def _build_user_response(user: User, db: Session) -> UserResponse:
    """Build a UserResponse with computed counts."""
    from app.models.housing import HousingAd
    from app.models.colocation import ColocationAd
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