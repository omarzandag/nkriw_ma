"""Reports router: create and manage reports."""

from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user, get_current_admin
from app.models.user import User
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportResponse, ReportAction
from app.utils.pagination import paginate
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/reports", tags=["Reports"])

VALID_CONTENT_TYPES = {"user", "housing", "colocation", "carpool", "comment", "thread", "message"}
VALID_REASONS = {"spam", "scam", "fake_info", "offensive", "harassment", "duplicate", "other"}


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    request: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new report."""
    if request.content_type not in VALID_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type. Valid types: {', '.join(VALID_CONTENT_TYPES)}",
        )

    if request.reason not in VALID_REASONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid reason. Valid reasons: {', '.join(VALID_REASONS)}",
        )

    report = Report(
        reporter_id=current_user.id,
        content_type=request.content_type,
        content_id=request.content_id,
        reason=request.reason,
        description=request.description,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return ReportResponse.model_validate(report)


@router.get("", response_model=dict)
def list_reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    content_type: str | None = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all reports (admin only)."""
    query = db.query(Report)
    if status_filter:
        query = query.filter(Report.status == status_filter)
    if content_type:
        query = query.filter(Report.content_type == content_type)
    query = query.order_by(Report.created_at.desc())
    items, total, pages = paginate(query, page, per_page)
    return {
        "items": [ReportResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": per_page,
    }


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get a single report (admin only)."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return ReportResponse.model_validate(report)


@router.post("/{report_id}/action", response_model=ReportResponse)
def take_action(
    report_id: UUID,
    request: ReportAction,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Take action on a report (admin only)."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    valid_statuses = {"reviewed", "dismissed", "warned", "suspended", "banned", "deleted"}
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Valid statuses: {', '.join(valid_statuses)}",
        )

    report.status = request.status
    report.admin_notes = request.admin_notes
    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)

    # If action involves user suspension/ban, handle it
    if request.status in ("suspended", "banned") and report.content_type == "user":
        reported_user = db.query(User).filter(User.id == report.content_id).first()
        if reported_user:
            if request.status == "suspended":
                reported_user.is_suspended = True
            elif request.status == "banned":
                reported_user.is_banned = True
                reported_user.is_active = False
            db.commit()

            # Notify the reported user
            create_notification(
                db,
                user_id=reported_user.id,
                type="admin_action",
                title=f"Your account has been {request.status}",
                body=request.admin_notes or "An administrator has taken action on your account.",
            )

    return ReportResponse.model_validate(report)


@router.get("/my/reports", response_model=dict)
def get_my_reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get reports submitted by the current user."""
    query = db.query(Report).filter(Report.reporter_id == current_user.id)
    query = query.order_by(Report.created_at.desc())
    items, total, pages = paginate(query, page, per_page)
    return {
        "items": [ReportResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": per_page,
    }