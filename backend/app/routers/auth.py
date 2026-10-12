"""Authentication router: register, login, logout, password reset."""

import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
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
    VerifyOtpRequest,
    ChangePasswordRequest,
)
from app.schemas.user import UserResponse
from app.services.settings_service import is_smtp_configured
from app.services.email_service import EmailError, send_password_reset_otp

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _utc_now_naive() -> datetime:
    """Current UTC time as a NAIVE datetime.

    The DB columns are plain DateTime (no tz) and PostgreSQL returns naive
    values, so all expiry comparisons must be naive-to-naive. Mixing an aware
    datetime.now(timezone.utc) with a naive column value raises TypeError.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _as_naive_utc(dt: datetime | None) -> datetime | None:
    """Normalize any datetime to naive UTC so comparisons never raise."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


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
    """Request a password reset OTP sent by email.

    Always returns the same generic response whether or not the email
    exists — never reveal account existence to anonymous callers.
    """
    generic_response = {
        "message": "If this email is registered, a password reset code has been sent"
    }

    user = db.query(User).filter(User.email == request.email).first()
    if not user or not user.is_active or user.is_banned:
        return generic_response

    # SMTP must be configured, otherwise we cannot deliver the code
    if not is_smtp_configured(db):
        # The admin hasn't set up email yet — stay silent to the user
        # (no enumeration leak), log it, and return the generic response.
        print("[email] forgot-password called but SMTP is not configured")
        return generic_response

    # Rate-limit resends: refuse a new OTP if one was issued < 60s ago
    now = _utc_now_naive()
    if user.reset_otp_expires:
        issued_at = _as_naive_utc(user.reset_otp_expires) - timedelta(
            minutes=settings.RESET_OTP_TTL_MINUTES
        )
        if (now - issued_at).total_seconds() < 60:
            return generic_response

    # Generate a 6-digit OTP
    otp_code = f"{secrets.randbelow(1000000):06d}"

    user.reset_otp = otp_code
    user.reset_otp_expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.RESET_OTP_TTL_MINUTES
    )
    user.reset_otp_attempts = 0
    # Invalidate any legacy token-based reset flow
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    # Send the email — failures must not break the flow or leak details
    try:
        send_password_reset_otp(db, user.email, user.full_name or user.username, otp_code)
    except EmailError as e:
        print(f"[email] Failed to send password reset OTP: {e}")
        # Clear the OTP so a stale code can't be used
        user.reset_otp = None
        user.reset_otp_expires = None
        db.commit()

    return generic_response


def _verify_otp(db: Session, email: str, otp: str):
    """Shared OTP verification used by verify-otp and reset-password.

    Returns the User on success, raises HTTPException otherwise.
    """
    user = db.query(User).filter(User.email == email).first()

    # Same generic error for unknown email and wrong code
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired reset code",
    )
    if not user or not user.reset_otp or not user.reset_otp_expires:
        raise invalid

    # Expired? (normalize both sides to naive UTC — the DB returns naive)
    expires = _as_naive_utc(user.reset_otp_expires)
    if _utc_now_naive() > expires:
        user.reset_otp = None
        user.reset_otp_expires = None
        user.reset_otp_attempts = 0
        db.commit()
        raise invalid

    # Too many failed attempts? Invalidate the code.
    if user.reset_otp_attempts >= settings.RESET_OTP_MAX_ATTEMPTS:
        user.reset_otp = None
        user.reset_otp_expires = None
        user.reset_otp_attempts = 0
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please request a new code.",
        )

    # Constant-time comparison of the 6-digit code
    if not secrets.compare_digest(user.reset_otp, otp):
        user.reset_otp_attempts += 1
        db.commit()
        raise invalid

    return user


@router.post("/verify-otp")
def verify_otp(request: VerifyOtpRequest, db: Session = Depends(get_db)):
    """Verify a password reset OTP without resetting the password yet.

    Lets the frontend validate the code before showing the new-password form.
    """
    _verify_otp(db, request.email, request.otp)
    return {"message": "Code verified", "valid": True}


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using the OTP code received by email."""
    user = _verify_otp(db, request.email, request.otp)

    user.hashed_password = get_password_hash(request.new_password)
    user.reset_otp = None
    user.reset_otp_expires = None
    user.reset_otp_attempts = 0
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