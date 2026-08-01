"""Comments router: nested comments on various content types."""

from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user, get_optional_user
from app.models.user import User
from app.models.comment import Comment, CommentLike
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from app.utils.pagination import paginate
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/comments", tags=["Comments"])

VALID_CONTENT_TYPES = {"housing", "colocation", "carpool", "forum"}


@router.get("/{content_type}/{content_id}", response_model=list[CommentResponse])
def list_comments(
    content_type: str,
    content_id: UUID,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """List top-level comments for a content item (with nested replies)."""
    if content_type not in VALID_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type. Valid types: {', '.join(VALID_CONTENT_TYPES)}",
        )

    # Get top-level comments (no parent)
    comments = db.query(Comment).filter(
        Comment.content_type == content_type,
        Comment.content_id == content_id,
        Comment.parent_id.is_(None),
    ).order_by(Comment.created_at.desc()).all()

    return [_build_comment_response(c, current_user, db) for c in comments]


@router.post("/{content_type}/{content_id}", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    content_type: str,
    content_id: UUID,
    request: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a comment on a content item."""
    if content_type not in VALID_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type. Valid types: {', '.join(VALID_CONTENT_TYPES)}",
        )

    # Validate parent comment if provided
    if request.parent_id:
        parent = db.query(Comment).filter(Comment.id == request.parent_id).first()
        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found")
        if parent.content_type != content_type or parent.content_id != content_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent comment mismatch")

    comment = Comment(
        user_id=current_user.id,
        content_type=content_type,
        content_id=content_id,
        parent_id=request.parent_id,
        content=request.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Notify content owner or parent comment owner
    if request.parent_id:
        # Reply to a comment - notify the parent comment owner
        parent = db.query(Comment).filter(Comment.id == request.parent_id).first()
        if parent and parent.user_id != current_user.id:
            parent_user = db.query(User).filter(User.id == parent.user_id).first()
            create_notification(
                db,
                user_id=parent.user_id,
                type="comment",
                title=f"New reply from {current_user.username}",
                body=request.content[:100],
                link=f"/{content_type}/{content_id}",
            )
    else:
        # Top-level comment - notify the content owner
        content_owner_id = _get_content_owner_id(content_type, content_id, db)
        if content_owner_id and content_owner_id != current_user.id:
            create_notification(
                db,
                user_id=content_owner_id,
                type="comment",
                title=f"New comment from {current_user.username}",
                body=request.content[:100],
                link=f"/{content_type}/{content_id}",
            )

    return _build_comment_response(comment, current_user, db)


@router.put("/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: UUID,
    request: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a comment (owner or admin only)."""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    comment.content = request.content
    db.commit()
    db.refresh(comment)
    return _build_comment_response(comment, current_user, db)


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a comment (owner or admin only)."""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(comment)
    db.commit()
    return None


@router.post("/{comment_id}/like", response_model=dict)
def toggle_comment_like(
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Like or unlike a comment."""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    existing = db.query(CommentLike).filter(
        CommentLike.comment_id == comment_id, CommentLike.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False, "likes_count": db.query(CommentLike).filter(CommentLike.comment_id == comment_id).count()}
    else:
        like = CommentLike(comment_id=comment_id, user_id=current_user.id)
        db.add(like)
        db.commit()
        return {"liked": True, "likes_count": db.query(CommentLike).filter(CommentLike.comment_id == comment_id).count()}


def _get_content_owner_id(content_type: str, content_id: UUID, db: Session) -> UUID | None:
    """Get the owner ID of a content item based on its type."""
    if content_type == "housing":
        from app.models.housing import HousingAd
        ad = db.query(HousingAd).filter(HousingAd.id == content_id).first()
        return ad.user_id if ad else None
    elif content_type == "colocation":
        from app.models.colocation import ColocationAd
        ad = db.query(ColocationAd).filter(ColocationAd.id == content_id).first()
        return ad.user_id if ad else None
    elif content_type == "carpool":
        from app.models.carpool import CarpoolAd
        ad = db.query(CarpoolAd).filter(CarpoolAd.id == content_id).first()
        return ad.user_id if ad else None
    elif content_type == "forum":
        from app.models.forum import ForumThread
        thread = db.query(ForumThread).filter(ForumThread.id == content_id).first()
        return thread.user_id if thread else None
    return None


def _build_comment_response(comment: Comment, current_user: User | None, db: Session) -> CommentResponse:
    """Build a comment response with nested replies, like info, and user info."""
    likes_count = db.query(CommentLike).filter(CommentLike.comment_id == comment.id).count()
    liked_by_me = False
    if current_user:
        liked_by_me = db.query(CommentLike).filter(
            CommentLike.comment_id == comment.id, CommentLike.user_id == current_user.id
        ).first() is not None

    replies = db.query(Comment).filter(Comment.parent_id == comment.id).order_by(Comment.created_at.asc()).all()
    reply_responses = [_build_comment_response(r, current_user, db) for r in replies]

    # Get user info
    user = db.query(User).filter(User.id == comment.user_id).first()

    return CommentResponse(
        id=comment.id,
        user_id=comment.user_id,
        content_type=comment.content_type,
        content_id=comment.content_id,
        parent_id=comment.parent_id,
        content=comment.content,
        created_at=comment.created_at,
        last_update=comment.last_update,
        likes_count=likes_count,
        liked_by_me=liked_by_me,
        replies=reply_responses,
        username=user.username if user else None,
        profile_picture=user.profile_picture if user else None,
    )
