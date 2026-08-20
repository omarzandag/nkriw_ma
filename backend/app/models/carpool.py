"""Carpool (shared transportation) model."""

import uuid
from datetime import datetime, timezone, date, time
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Integer, Float, Date, Time, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


from sqlalchemy.orm import relationship

class CarpoolAd(Base):
    """Carpool advertisement for shared transportation between cities."""

    __tablename__ = "carpool_ads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Trip details
    departure_city = Column(String(100), nullable=False, index=True)
    destination_city = Column(String(100), nullable=False, index=True)
    departure_date = Column(Date, nullable=False, index=True)
    departure_time = Column(Time, nullable=False)
    available_seats = Column(Integer, nullable=False)
    price_per_passenger = Column(Float, nullable=False)

    # Vehicle info
    vehicle_model = Column(String(100), nullable=True)
    vehicle_color = Column(String(50), nullable=True)

    # Driver info
    driver_name = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=True)

    # Meeting & arrival
    meeting_point = Column(String(255), nullable=True)
    estimated_arrival = Column(String(50), nullable=True)

    # Additional info
    additional_info = Column(Text, nullable=True)

    # Status & timestamps
    status = Column(String(20), default="active")  # active, completed, cancelled
    publication_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_update = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    views = Column(Integer, default=0)

    # Relationships
    bookings = relationship("CarpoolBooking", back_populates="carpool_ad", cascade="all, delete-orphan")


class CarpoolBooking(Base):
    """Carpool booking space reservation."""

    __tablename__ = "carpool_bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    carpool_ad_id = Column(UUID(as_uuid=True), ForeignKey("carpool_ads.id", ondelete="CASCADE"), nullable=False)
    passenger_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    seats_requested = Column(Integer, nullable=False, default=1)
    status = Column(String(20), default="pending")  # pending, accepted, rejected, cancelled
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_update = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    carpool_ad = relationship("CarpoolAd", back_populates="bookings")
    passenger = relationship("User", backref="carpool_bookings")