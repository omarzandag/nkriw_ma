"""Site settings model (key-value store for admin-configurable values)."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime

from app.database import Base


class SiteSetting(Base):
    """Key-value site settings.

    Currently used for SMTP configuration (admin-configurable from the
    dashboard), but generic enough to hold any future site-wide setting.
    """

    __tablename__ = "site_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self):
        return f"<SiteSetting {self.key}>"
