"""Forum router: threads, replies, likes, and follows."""

from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user, get_optional_user
from app.models.user import User
from app.models.forum import ForumThread, ForumReply, ReplyLike, ForumFollow
from app.schemas.forum import (
    ForumThreadResponse,
    ForumThreadCreate,
    ForumThreadUpdate,
    ForumReplyResponse,
    ForumReplyCreate,
    ForumReplyUpdate,
)
from app.utils.pagination import paginate
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/forum", tags=["Forum"])

VALID_CATEGORIES = {
    "housing", "colocation", "transportation", "universities",
    "student_life", "general", "help",
}


def notify_thread_followers(
    db: Session,
    thread: ForumThread,
    type: str,
    title: str,
    body: str | None = None,
    exclude_user_id: UUID | None = None,
):
    """Send a notification to all users following a thread."""
    follows = db.query(ForumFollow).filter(ForumFollow.thread_id == thread.id).all()
    for follow in follows:
        if exclude_user_id and follow.user_id == exclude_user_id:
            continue
        create_notification(
            db,
            user_id=follow.user_id,
            type=type,
            title=title,
            body=body,
            link=f"/forum/{thread.id}",
        )


@router.get("/threads", response_model=dict)
def list_threads(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    category: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
):
    """List forum threads with optional category filter and search."""
    query = db.query(ForumThread)

    if category:
        query = query.filter(ForumThread.category == category)
    if keyword:
        query = query.filter(
            (ForumThread.title.ilike(f"%{keyword}%")) |
            (ForumThread.content.ilike(f"%{keyword}%"))
        )

    query = query.order_by(ForumThread.is_pinned.desc(), ForumThread.created_at.desc())
    items, total, pages = paginate(query, page, per_page)

    result = []
    for item in items:
        thread_dict = ForumThreadResponse.model_validate(item).model_dump()
        thread_dict["replies_count"] = db.query(ForumReply).filter(ForumReply.thread_id == item.id).count()
        thread_dict["followers_count"] = db.query(ForumFollow).filter(ForumFollow.thread_id == item.id).count()
        # Include author info
        author = db.query(User).filter(User.id == item.user_id).first()
        thread_dict["author_username"] = author.username if author else None
        thread_dict["author_profile_picture"] = author.profile_picture if author else None
        result.append(thread_dict)

    return {"items": result, "total": total, "page": page, "pages": pages, "per_page": per_page}


@router.get("/threads/{thread_id}", response_model=dict)
def get_thread(
    thread_id: UUID,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Get a single forum thread by ID."""
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    thread.views = (thread.views or 0) + 1
    db.commit()
    db.refresh(thread)

    thread_dict = ForumThreadResponse.model_validate(thread).model_dump()
    thread_dict["replies_count"] = db.query(ForumReply).filter(ForumReply.thread_id == thread.id).count()
    thread_dict["followers_count"] = db.query(ForumFollow).filter(ForumFollow.thread_id == thread.id).count()
    thread_dict["is_following"] = False
    if current_user:
        thread_dict["is_following"] = db.query(ForumFollow).filter(
            ForumFollow.thread_id == thread.id,
            ForumFollow.user_id == current_user.id,
        ).first() is not None
    # Include author info
    author = db.query(User).filter(User.id == thread.user_id).first()
    thread_dict["author_username"] = author.username if author else None
    thread_dict["author_profile_picture"] = author.profile_picture if author else None
    return thread_dict


@router.post("/threads", response_model=ForumThreadResponse, status_code=status.HTTP_201_CREATED)
def create_thread(
    request: ForumThreadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new forum thread."""
    if request.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Valid categories: {', '.join(VALID_CATEGORIES)}",
        )

    thread = ForumThread(
        user_id=current_user.id,
        title=request.title,
        category=request.category,
        content=request.content,
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return ForumThreadResponse.model_validate(thread)


@router.put("/threads/{thread_id}", response_model=ForumThreadResponse)
def update_thread(
    thread_id: UUID,
    request: ForumThreadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a forum thread (owner or admin only)."""
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    if thread.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if request.category and request.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Valid categories: {', '.join(VALID_CATEGORIES)}",
        )

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(thread, field, value)

    db.commit()
    db.refresh(thread)

    # Notify followers about the modification
    notify_thread_followers(
        db,
        thread=thread,
        type="forum_update",
        title=f"Thread updated: {thread.title}",
        body="This thread has been modified.",
        exclude_user_id=current_user.id,
    )

    return ForumThreadResponse.model_validate(thread)


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_thread(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a forum thread (owner or admin only)."""
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    if thread.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(thread)
    db.commit()
    return None


@router.get("/threads/{thread_id}/replies", response_model=dict)
def list_replies(
    thread_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """List replies for a thread."""
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    query = db.query(ForumReply).filter(ForumReply.thread_id == thread_id)
    query = query.order_by(ForumReply.created_at.asc())
    items, total, pages = paginate(query, page, per_page)

    result = []
    for item in items:
        reply_dict = ForumReplyResponse.model_validate(item).model_dump()
        reply_dict["likes_count"] = db.query(ReplyLike).filter(ReplyLike.reply_id == item.id).count()
        if current_user:
            reply_dict["liked_by_me"] = db.query(ReplyLike).filter(
                ReplyLike.reply_id == item.id, ReplyLike.user_id == current_user.id
            ).first() is not None
        else:
            reply_dict["liked_by_me"] = False
        # Include user info for profile picture display
        reply_user = db.query(User).filter(User.id == item.user_id).first()
        if reply_user:
            reply_dict["username"] = reply_user.username
            reply_dict["profile_picture"] = reply_user.profile_picture
        else:
            reply_dict["username"] = "unknown"
            reply_dict["profile_picture"] = None
        result.append(reply_dict)

    return {"items": result, "total": total, "page": page, "pages": pages, "per_page": per_page}


@router.post("/threads/{thread_id}/replies", response_model=ForumReplyResponse, status_code=status.HTTP_201_CREATED)
def create_reply(
    thread_id: UUID,
    request: ForumReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a reply on a thread (supports nested replies via parent_id)."""
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    if thread.is_closed and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Thread is closed")

    parent_reply = None
    if request.parent_id:
        parent_reply = db.query(ForumReply).filter(ForumReply.id == request.parent_id).first()
        if not parent_reply:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent reply not found")
        if parent_reply.thread_id != thread_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent reply does not belong to this thread",
            )

    reply = ForumReply(
        thread_id=thread_id,
        user_id=current_user.id,
        content=request.content,
        parent_id=request.parent_id,
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)

    # Notify thread author (only for top-level replies)
    if not parent_reply and thread.user_id != current_user.id:
        create_notification(
            db,
            user_id=thread.user_id,
            type="reply",
            title=f"{current_user.username} replied to your thread",
            body=request.content[:100],
            link=f"/forum/{thread_id}",
        )

    # Notify parent reply author (for nested replies)
    if parent_reply and parent_reply.user_id != current_user.id:
        create_notification(
            db,
            user_id=parent_reply.user_id,
            type="reply",
            title=f"{current_user.username} replied to your comment",
            body=request.content[:100],
            link=f"/forum/{thread_id}",
        )

    # Notify all followers about the new reply
    notify_thread_followers(
        db,
        thread=thread,
        type="forum_reply",
        title=f"New reply in: {thread.title}",
        body=f"{current_user.username}: {request.content[:100]}",
        exclude_user_id=current_user.id,
    )

    return ForumReplyResponse.model_validate(reply)


@router.put("/replies/{reply_id}", response_model=ForumReplyResponse)
def update_reply(
    reply_id: UUID,
    request: ForumReplyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a reply (owner or admin only)."""
    reply = db.query(ForumReply).filter(ForumReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found")

    if reply.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    reply.content = request.content
    db.commit()
    db.refresh(reply)

    # Notify followers about the reply modification
    thread = db.query(ForumThread).filter(ForumThread.id == reply.thread_id).first()
    if thread:
        notify_thread_followers(
            db,
            thread=thread,
            type="forum_update",
            title=f"Reply updated in: {thread.title}",
            body=f"{current_user.username} modified a reply.",
            exclude_user_id=current_user.id,
        )

    return ForumReplyResponse.model_validate(reply)


@router.delete("/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reply(
    reply_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a reply (owner or admin only)."""
    reply = db.query(ForumReply).filter(ForumReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found")

    if reply.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(reply)
    db.commit()
    return None


@router.post("/replies/{reply_id}/like", response_model=dict)
def toggle_reply_like(
    reply_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Like or unlike a reply."""
    reply = db.query(ForumReply).filter(ForumReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found")

    existing = db.query(ReplyLike).filter(
        ReplyLike.reply_id == reply_id, ReplyLike.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False, "likes_count": db.query(ReplyLike).filter(ReplyLike.reply_id == reply_id).count()}
    else:
        like = ReplyLike(reply_id=reply_id, user_id=current_user.id)
        db.add(like)
        db.commit()
        return {"liked": True, "likes_count": db.query(ReplyLike).filter(ReplyLike.reply_id == reply_id).count()}


@router.post("/threads/{thread_id}/follow", response_model=dict)
def follow_thread(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Follow a forum thread to receive notifications about its activity."""
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    existing = db.query(ForumFollow).filter(
        ForumFollow.thread_id == thread_id,
        ForumFollow.user_id == current_user.id,
    ).first()
    if existing:
        return {"following": True, "followers_count": db.query(ForumFollow).filter(ForumFollow.thread_id == thread_id).count()}

    follow = ForumFollow(thread_id=thread_id, user_id=current_user.id)
    db.add(follow)
    db.commit()
    return {"following": True, "followers_count": db.query(ForumFollow).filter(ForumFollow.thread_id == thread_id).count()}


@router.post("/threads/{thread_id}/unfollow", response_model=dict)
def unfollow_thread(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unfollow a forum thread."""
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    existing = db.query(ForumFollow).filter(
        ForumFollow.thread_id == thread_id,
        ForumFollow.user_id == current_user.id,
    ).first()
    if existing:
        db.delete(existing)
        db.commit()

    return {"following": False, "followers_count": db.query(ForumFollow).filter(ForumFollow.thread_id == thread_id).count()}


@router.post("/threads/{thread_id}/pin", response_model=ForumThreadResponse)
def toggle_pin_thread(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pin or unpin a thread (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")

    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    thread.is_pinned = not thread.is_pinned
    db.commit()
    db.refresh(thread)
    return ForumThreadResponse.model_validate(thread)


@router.post("/threads/{thread_id}/close", response_model=ForumThreadResponse)
def toggle_close_thread(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Close or reopen a thread (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")

    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    thread.is_closed = not thread.is_closed
    db.commit()
    db.refresh(thread)
    return ForumThreadResponse.model_validate(thread)