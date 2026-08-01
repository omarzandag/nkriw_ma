"""File storage service.

During development, files are stored locally in the uploads directory.
The architecture allows easy migration to cloud object storage (S3, Cloudinary, MinIO).
"""

import os
import uuid
from pathlib import Path

from fastapi import UploadFile, HTTPException, status

from app.core.config import settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def ensure_upload_dir():
    """Ensure the upload directory exists."""
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path


def validate_image(file: UploadFile) -> None:
    """Validate that the uploaded file is an allowed image."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} is not allowed. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension {ext} is not allowed.",
        )


async def save_upload_file(file: UploadFile, subdir: str = "") -> str:
    """Save an uploaded file and return its relative URL path.

    Args:
        file: The uploaded file.
        subdir: Subdirectory within uploads (e.g., 'housing', 'profiles').

    Returns:
        Relative URL path like '/uploads/housing/uuid.jpg'
    """
    validate_image(file)

    upload_path = ensure_upload_dir()
    if subdir:
        target_dir = upload_path / subdir
    else:
        target_dir = upload_path
    target_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix.lower()
    filename = f"{uuid.uuid4()}{ext}"
    file_path = target_dir / filename

    content = await file.read()

    # Check file size
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
        )

    with open(file_path, "wb") as f:
        f.write(content)

    # Return URL path
    relative_path = f"/uploads/{subdir}/{filename}" if subdir else f"/uploads/{filename}"
    return relative_path