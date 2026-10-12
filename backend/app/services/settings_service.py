"""Settings service: read/write admin-configurable site settings.

Settings are stored in the database (key-value table) so the admin can
configure them from the dashboard. Environment variables in .env act as
bootstrap defaults: a database value always wins over the env value.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.models.settings import SiteSetting
from app.core.config import settings as env_settings

# Keys stored in the site_settings table (all SMTP-related for now)
SMTP_KEYS = [
    "smtp_enabled",
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",
    "smtp_from_email",
    "smtp_from_name",
    "smtp_use_tls",
    "smtp_use_ssl",
]


def get_setting(db: Session, key: str, default: Any = None) -> Any:
    """Read a single setting value from the database."""
    row = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    return row.value if row and row.value is not None else default


def set_setting(db: Session, key: str, value: str) -> None:
    """Write a single setting value to the database."""
    row = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if row:
        row.value = value
    else:
        row = SiteSetting(key=key, value=value)
        db.add(row)
    db.commit()


def get_smtp_config(db: Session) -> dict:
    """Build the SMTP configuration.

    Precedence: database value > environment (.env) value > built-in default.
    The password is only returned from the database (never from env defaults
    baked into code — those are empty by design).
    """
    def _value(key: str, env_default: Any = "") -> str:
        db_value = get_setting(db, key)
        return db_value if db_value is not None else env_default

    def _bool(key: str, env_default: bool) -> bool:
        db_value = get_setting(db, key)
        if db_value is None:
            return env_default
        return str(db_value).lower() in ("1", "true", "yes", "on")

    return {
        "enabled": _bool("smtp_enabled", env_settings.SMTP_ENABLED),
        "host": _value("smtp_host", env_settings.SMTP_HOST),
        "port": int(_value("smtp_port", env_settings.SMTP_PORT) or 587),
        "user": _value("smtp_user", env_settings.SMTP_USER),
        "password": _value("smtp_password", ""),
        "from_email": _value("smtp_from_email", env_settings.SMTP_FROM_EMAIL),
        "from_name": _value("smtp_from_name", env_settings.SMTP_FROM_NAME),
        "use_tls": _bool("smtp_use_tls", env_settings.SMTP_USE_TLS),
        "use_ssl": _bool("smtp_use_ssl", env_settings.SMTP_USE_SSL),
    }


def is_smtp_configured(db: Session) -> bool:
    """Check whether SMTP has enough configuration to send emails."""
    cfg = get_smtp_config(db)
    return bool(cfg["enabled"] and cfg["host"] and cfg["user"])
