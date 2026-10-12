"""User model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Integer, Float
)
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class User(Base):
    """User model representing both regular users and administrators."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # Profile fields
    profile_picture = Column(String(500), nullable=True)
    cover_picture = Column(String(500), nullable=True)
    phone_number = Column(String(20), nullable=True)
    gender = Column(String(20), nullable=True)  # male, female, other
    date_of_birth = Column(DateTime, nullable=True)
    city = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)

    # Role & status
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_banned = Column(Boolean, default=False, nullable=False)
    is_suspended = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)

    # Timestamps
    join_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_active = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Future features
    rating = Column(Float, default=0.0)
    verification_badge = Column(Boolean, default=False)

    # Password reset (OTP-based)
    reset_otp = Column(String(10), nullable=True)  # 6-digit code
    reset_otp_expires = Column(DateTime, nullable=True)
    reset_otp_attempts = Column(Integer, default=0, nullable=False)  # brute-force guard
    reset_token = Column(String(500), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User {self.username}>"