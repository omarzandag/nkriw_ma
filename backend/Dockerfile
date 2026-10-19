# syntax=docker/dockerfile:1.10
#
# NKRIW.MA — backend (FastAPI + Uvicorn)
# Single-stage image: lean, reliable, no cross-stage path assumptions.
# Run with:  uvicorn app.main:app --host 0.0.0.0 --port 8000
# The app auto-creates its schema + default admin in the FastAPI lifespan,
# so a fresh Postgres DB needs no manual migrations on first start.
#
# Env is supplied by docker-compose (see docker-compose.yml). The app reads
# pydantic-settings from env vars; .env is NOT baked into the image.

FROM python:3.12-slim

# --- Python hygiene ---
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app \
    UPLOAD_DIR=/data/uploads

WORKDIR /app

# --- Install dependencies (psycopg2-binary ships manylinux wheels) ---
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Sanity-check that every declared dependency imports cleanly.
RUN python -c "import fastapi,uvicorn,sqlalchemy,alembic,psycopg2,pydantic,pydantic_settings,jose,bcrypt,multipart,email_validator,dotenv,aiofiles,slowapi"

# --- Application code (selective copy: never includes .env / uploads / tests) ---
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY run.py ./

# Upload store (bind-mounted volume in production via docker-compose)
RUN mkdir -p /data/uploads && chmod -R 777 /data/uploads

EXPOSE 8000

# Readiness probe — the app exposes GET /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/health', timeout=3)" || exit 1

# No --reload in containers; DEBUG only controls error-detail verbosity.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
