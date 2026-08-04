"""Main FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User


def add_missing_columns():
    """Add any missing columns to existing tables (for schema upgrades)."""
    from sqlalchemy import inspect, text

    db = SessionLocal()
    try:
        inspector = inspect(db.bind)

        # Add read_at column to messages table if missing
        msg_columns = [col["name"] for col in inspector.get_columns("messages")]
        if "read_at" not in msg_columns:
            db.execute(text("ALTER TABLE messages ADD COLUMN read_at TIMESTAMP WITHOUT TIME ZONE"))
            db.commit()
            print("Added 'read_at' column to messages table")

        # Add parent_id column to forum_replies table if missing (for nested replies)
        reply_columns = [col["name"] for col in inspector.get_columns("forum_replies")]
        if "parent_id" not in reply_columns:
            db.execute(text(
                "ALTER TABLE forum_replies ADD COLUMN parent_id UUID "
                "REFERENCES forum_replies(id) ON DELETE CASCADE"
            ))
            db.commit()
            db.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_forum_replies_parent_id "
                "ON forum_replies (parent_id)"
            ))
            db.commit()
            print("Added 'parent_id' column to forum_replies table")
    except Exception as e:
        db.rollback()
        print(f"Schema check completed (may already be up to date): {e}")
    finally:
        db.close()


def create_admin_if_not_exists():
    """Create the default admin account during initial database setup."""
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                email=settings.ADMIN_EMAIL,
                username="admin",
                full_name="Administrator",
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                is_admin=True,
                email_verified=True,
            )
            db.add(admin)
            db.commit()
            print(f"Default admin account created: {settings.ADMIN_EMAIL}")
        else:
            print("Admin account already exists.")
    except Exception as e:
        db.rollback()
        print(f"Admin account check completed (may already exist): {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create tables and default admin on startup."""
    # Create upload directory
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Add missing columns for schema upgrades
    add_missing_columns()

    # Create default admin
    create_admin_if_not_exists()

    print(f"{settings.APP_NAME} v{settings.APP_VERSION} started successfully!")
    yield
    print(f"{settings.APP_NAME} shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="A modern web platform for house rentals, shared accommodation, and carpooling in Morocco.",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists before mounting
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
from app.routers import auth, users, housing, colocation, carpool, forum, messaging, comments, notifications, reports, admin

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(housing.router)
app.include_router(colocation.router)
app.include_router(carpool.router)
app.include_router(forum.router)
app.include_router(messaging.router)
app.include_router(comments.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(admin.router)


@app.get("/", tags=["Root"])
def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "documentation": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc) if settings.DEBUG else None},
    )