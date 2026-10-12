"""Admin router: SMTP / email settings configuration.

The admin configures the platform's SMTP credentials from the dashboard.
The stored SMTP password is never returned by the API — only a boolean
indicating whether one is set.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_admin
from app.models.user import User
from app.services.settings_service import get_smtp_config, set_setting
from app.services.email_service import EmailError, send_test_email

router = APIRouter(prefix="/api/admin/settings", tags=["Administration — Settings"])


class SmtpSettingsResponse(BaseModel):
    """SMTP settings as returned to the admin dashboard.

    The password is deliberately excluded — `password_set` tells the
    frontend whether one is already stored.
    """
    enabled: bool
    host: str
    port: int
    user: str
    password_set: bool
    from_email: str
    from_name: str
    use_tls: bool
    use_ssl: bool
    configured: bool


class SmtpSettingsUpdate(BaseModel):
    """SMTP settings update payload from the admin dashboard."""
    enabled: bool | None = None
    host: str | None = Field(default=None, max_length=255)
    port: int | None = Field(default=None, ge=1, le=65535)
    user: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, max_length=255)
    from_email: str | None = Field(default=None, max_length=255)
    from_name: str | None = Field(default=None, max_length=100)
    use_tls: bool | None = None
    use_ssl: bool | None = None


class TestEmailRequest(BaseModel):
    """Request to send a test email to a given address."""
    to_email: EmailStr


@router.get("/smtp", response_model=SmtpSettingsResponse)
def get_smtp_settings(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get the current SMTP configuration (password masked)."""
    cfg = get_smtp_config(db)
    return SmtpSettingsResponse(
        enabled=cfg["enabled"],
        host=cfg["host"] or "",
        port=cfg["port"],
        user=cfg["user"] or "",
        password_set=bool(cfg["password"]),
        from_email=cfg["from_email"] or "",
        from_name=cfg["from_name"] or "",
        use_tls=cfg["use_tls"],
        use_ssl=cfg["use_ssl"],
        configured=bool(cfg["enabled"] and cfg["host"] and cfg["user"]),
    )


@router.put("/smtp", response_model=SmtpSettingsResponse)
def update_smtp_settings(
    request: SmtpSettingsUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update the SMTP configuration.

    Only fields explicitly provided are written; omitting the password
    keeps the existing stored password.
    """
    # Map request field name -> storage key (they differ: "host" -> "smtp_host")
    field_to_key = {
        "enabled": "smtp_enabled",
        "host": "smtp_host",
        "port": "smtp_port",
        "user": "smtp_user",
        "password": "smtp_password",
        "from_email": "smtp_from_email",
        "from_name": "smtp_from_name",
        "use_tls": "smtp_use_tls",
        "use_ssl": "smtp_use_ssl",
    }

    data = request.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is None:
            continue
        key = field_to_key[field]
        if isinstance(value, bool):
            set_setting(db, key, "true" if value else "false")
        else:
            set_setting(db, key, str(value))

    cfg = get_smtp_config(db)
    return SmtpSettingsResponse(
        enabled=cfg["enabled"],
        host=cfg["host"] or "",
        port=cfg["port"],
        user=cfg["user"] or "",
        password_set=bool(cfg["password"]),
        from_email=cfg["from_email"] or "",
        from_name=cfg["from_name"] or "",
        use_tls=cfg["use_tls"],
        use_ssl=cfg["use_ssl"],
        configured=bool(cfg["enabled"] and cfg["host"] and cfg["user"]),
    )


@router.post("/smtp/test", response_model=dict)
def send_smtp_test_email(
    request: TestEmailRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Send a test email using the current SMTP configuration."""
    try:
        send_test_email(db, request.to_email)
    except EmailError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    return {"message": f"Test email sent to {request.to_email}"}
