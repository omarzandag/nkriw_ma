"""Administration dashboard router: statistics and management."""

from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.deps import get_current_admin
from app.models.user import User
from app.models.housing import HousingAd
from app.models.colocation import ColocationAd
from app.models.carpool import CarpoolAd
from app.models.forum import ForumThread, ForumReply
from app.models.comment import Comment
from app.models.messaging import Conversation, Message
from app.models.report import Report
from app.models.notification import Notification
from app.schemas.user import UserResponse, AdminUserUpdate
from app.utils.pagination import paginate

router = APIRouter(prefix="/api/admin", tags=["Administration"])


@router.get("/stats", response_model=dict)
def get_dashboard_stats(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get dashboard statistics."""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True, User.is_banned == False).count()
    new_users = db.query(User).filter(User.join_date >= thirty_days_ago).count()
    banned_users = db.query(User).filter(User.is_banned == True).count()

    total_housing = db.query(HousingAd).count()
    total_colocation = db.query(ColocationAd).count()
    total_carpool = db.query(CarpoolAd).count()
    total_threads = db.query(ForumThread).count()
    total_comments = db.query(Comment).count()
    total_messages = db.query(Message).count()
    pending_reports = db.query(Report).filter(Report.status == "pending").count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "new_users": new_users,
        "banned_users": banned_users,
        "total_housing_ads": total_housing,
        "total_colocation_ads": total_colocation,
        "total_carpool_ads": total_carpool,
        "total_forum_threads": total_threads,
        "total_comments": total_comments,
        "total_messages": total_messages,
        "pending_reports": pending_reports,
    }


@router.get("/stats/registrations", response_model=list[dict])
def get_registration_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get user registration counts over time."""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)

    results = db.query(
        func.date_trunc("day", User.join_date).label("date"),
        func.count(User.id).label("count"),
    ).filter(
        User.join_date >= start_date
    ).group_by("date").order_by("date").all()

    return [{"date": str(r.date), "count": r.count} for r in results]


@router.get("/stats/ads-per-city", response_model=list[dict])
def get_ads_per_city(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get advertisement counts per city."""
    housing = db.query(
        HousingAd.city.label("city"), func.count(HousingAd.id).label("count")
    ).group_by(HousingAd.city).all()

    return [{"city": r.city, "count": r.count} for r in housing]


@router.get("/stats/forum-activity", response_model=list[dict])
def get_forum_activity(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get forum activity over time."""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)

    results = db.query(
        func.date_trunc("day", ForumThread.created_at).label("date"),
        func.count(ForumThread.id).label("threads"),
    ).filter(
        ForumThread.created_at >= start_date
    ).group_by("date").order_by("date").all()

    return [{"date": str(r.date), "threads": r.threads} for r in results]


@router.get("/users", response_model=dict)
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = None,
    is_admin: bool | None = None,
    is_banned: bool | None = None,
    is_suspended: bool | None = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all users (admin only)."""
    query = db.query(User)
    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%"))
        )
    if is_admin is not None:
        query = query.filter(User.is_admin == is_admin)
    if is_banned is not None:
        query = query.filter(User.is_banned == is_banned)
    if is_suspended is not None:
        query = query.filter(User.is_suspended == is_suspended)

    query = query.order_by(User.join_date.desc())
    items, total, pages = paginate(query, page, per_page)

    return {
        "items": [
            {
                "id": str(u.id),
                "email": u.email,
                "username": u.username,
                "full_name": u.full_name,
                "is_admin": u.is_admin,
                "is_active": u.is_active,
                "is_banned": u.is_banned,
                "is_suspended": u.is_suspended,
                "email_verified": u.email_verified,
                "join_date": u.join_date.isoformat() if u.join_date else None,
                "last_active": u.last_active.isoformat() if u.last_active else None,
                "city": u.city,
            }
            for u in items
        ],
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": per_page,
    }


@router.put("/users/{user_id}", response_model=dict)
def update_user(
    user_id: UUID,
    request: AdminUserUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a user's admin-level properties (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    # If banning, also deactivate
    if request.is_banned is True:
        user.is_active = False
    elif request.is_banned is False:
        user.is_active = True

    db.commit()
    return {"message": "User updated successfully"}


@router.post("/users/{user_id}/suspend", response_model=dict)
def suspend_user(
    user_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Suspend a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_suspended = True
    db.commit()
    return {"message": "User suspended"}


@router.post("/users/{user_id}/unsuspend", response_model=dict)
def unsuspend_user(
    user_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Unsuspend a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_suspended = False
    db.commit()
    return {"message": "User unsuspended"}


@router.post("/users/{user_id}/ban", response_model=dict)
def ban_user(
    user_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Ban a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot ban an administrator")

    user.is_banned = True
    user.is_active = False
    db.commit()
    return {"message": "User banned"}


@router.post("/users/{user_id}/unban", response_model=dict)
def unban_user(
    user_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Unban a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_banned = False
    user.is_active = True
    db.commit()
    return {"message": "User unbanned"}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_admin and user.email == "admin@nkriw.ma":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete the primary administrator")

    db.delete(user)
    db.commit()
    return None


@router.get("/housing", response_model=dict)
def admin_list_housing(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all housing ads (admin only)."""
    query = db.query(HousingAd).order_by(HousingAd.publication_date.desc())
    items, total, pages = paginate(query, page, per_page)
    return {
        "items": [
            {
                "id": str(a.id),
                "title": a.title,
                "city": a.city,
                "status": a.status,
                "user_id": str(a.user_id),
                "publication_date": a.publication_date.isoformat() if a.publication_date else None,
            }
            for a in items
        ],
        "total": total, "page": page, "pages": pages, "per_page": per_page,
    }


@router.delete("/housing/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_housing(
    ad_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete any housing ad (admin only)."""
    ad = db.query(HousingAd).filter(HousingAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Housing ad not found")
    db.delete(ad)
    db.commit()
    return None


@router.delete("/colocation/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_colocation(
    ad_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete any co-location ad (admin only)."""
    ad = db.query(ColocationAd).filter(ColocationAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Co-location ad not found")
    db.delete(ad)
    db.commit()
    return None


@router.delete("/carpool/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_carpool(
    ad_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete any carpool ad (admin only)."""
    ad = db.query(CarpoolAd).filter(CarpoolAd.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpool ad not found")
    db.delete(ad)
    db.commit()
    return None


@router.delete("/forum/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_thread(
    thread_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete any forum thread (admin only)."""
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    db.delete(thread)
    db.commit()
    return None


@router.delete("/forum/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_reply(
    reply_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete any forum reply (admin only)."""
    reply = db.query(ForumReply).filter(ForumReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found")
    db.delete(reply)
    db.commit()
    return None


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_comment(
    comment_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete any comment (admin only)."""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    db.delete(comment)
    db.commit()
    return None