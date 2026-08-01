"""Messaging router: conversations and messages."""

from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.messaging import Conversation, Message
from app.schemas.messaging import MessageCreate, MessageResponse, ConversationResponse
from app.utils.pagination import paginate

router = APIRouter(prefix="/api/messaging", tags=["Messaging"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

manager = ConnectionManager()


@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all conversations for the current user."""
    conversations = db.query(Conversation).filter(
        or_(
            Conversation.user1_id == current_user.id,
            Conversation.user2_id == current_user.id,
        )
    ).order_by(Conversation.last_message_at.desc()).all()

    result = []
    for conv in conversations:
        other_user_id = conv.user2_id if conv.user1_id == current_user.id else conv.user1_id
        other_user = db.query(User).filter(User.id == other_user_id).first()

        last_msg = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).order_by(Message.created_at.desc()).first()

        unread = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.receiver_id == current_user.id,
            Message.is_read == False,
        ).count()

        result.append(ConversationResponse(
            id=conv.id,
            user1_id=conv.user1_id,
            user2_id=conv.user2_id,
            created_at=conv.created_at,
            last_message_at=conv.last_message_at,
            last_message=last_msg.content if last_msg else None,
            unread_count=unread,
            other_user_username=other_user.username if other_user else None,
            other_user_profile_picture=other_user.profile_picture if other_user else None,
            blocked_by=conv.blocked_by,
        ))

    return result


@router.get("/conversations/{conversation_id}/messages", response_model=dict)
def get_messages(
    conversation_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get messages in a conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conv.user1_id != current_user.id and conv.user2_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    query = db.query(Message).filter(Message.conversation_id == conversation_id)
    query = query.order_by(Message.created_at.desc())
    items, total, pages = paginate(query, page, per_page)

    # Mark messages as read
    unread = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False,
    ).all()
    for msg in unread:
        msg.is_read = True
    db.commit()

    return {
        "items": [MessageResponse.model_validate(item) for item in reversed(items)],
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": per_page,
    }


@router.post("/conversations", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def start_conversation(
    request: MessageCreate,
    receiver_id: UUID = Query(..., description="User ID to start conversation with"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a new conversation or send a message to an existing one."""
    if receiver_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot message yourself")

    receiver = db.query(User).filter(User.id == receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receiver not found")

    # Find or create conversation
    conv = db.query(Conversation).filter(
        or_(
            and_(Conversation.user1_id == current_user.id, Conversation.user2_id == receiver_id),
            and_(Conversation.user1_id == receiver_id, Conversation.user2_id == current_user.id),
        )
    ).first()

    if not conv:
        conv = Conversation(user1_id=current_user.id, user2_id=receiver_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Check if blocked
    if conv.blocked_by is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conversation is blocked")

    # Create message
    msg = Message(
        conversation_id=conv.id,
        sender_id=current_user.id,
        receiver_id=receiver_id,
        content=request.content,
    )
    db.add(msg)

    conv.last_message_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)

    # Send real-time notification via WebSocket
    await manager.send_personal_message({
        "type": "new_message",
        "conversation_id": str(conv.id),
        "message": MessageResponse.model_validate(msg).model_dump(mode='json')
    }, str(receiver_id))

    return MessageResponse.model_validate(msg)


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: UUID,
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message in an existing conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conv.user1_id != current_user.id and conv.user2_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if conv.blocked_by is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conversation is blocked")

    receiver_id = conv.user2_id if conv.user1_id == current_user.id else conv.user1_id

    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        receiver_id=receiver_id,
        content=request.content,
    )
    db.add(msg)

    conv.last_message_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)

    # Send real-time notification via WebSocket
    await manager.send_personal_message({
        "type": "new_message",
        "conversation_id": str(conversation_id),
        "message": MessageResponse.model_validate(msg).model_dump(mode='json')
    }, str(receiver_id))

    return MessageResponse.model_validate(msg)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conv.user1_id != current_user.id and conv.user2_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(conv)
    db.commit()
    return None


@router.post("/conversations/{conversation_id}/block", response_model=dict)
def block_user(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Block the other user in a conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conv.user1_id != current_user.id and conv.user2_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    conv.blocked_by = current_user.id
    db.commit()
    return {"message": "User blocked successfully"}


@router.post("/conversations/{conversation_id}/unblock", response_model=dict)
def unblock_user(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unblock the other user in a conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conv.blocked_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the blocker can unblock")

    conv.blocked_by = None
    db.commit()
    return {"message": "User unblocked successfully"}


@router.get("/unread-count", response_model=dict)
def get_unread_message_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get total unread message count across all conversations."""
    # Get all conversations for the current user
    conversations = db.query(Conversation).filter(
        or_(
            Conversation.user1_id == current_user.id,
            Conversation.user2_id == current_user.id,
        )
    ).all()

    # Count total unread messages
    total_unread = 0
    for conv in conversations:
        unread = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.receiver_id == current_user.id,
            Message.is_read == False,
        ).count()
        total_unread += unread

    return {"unread_count": total_unread}


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time messaging."""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive and wait for any messages
            data = await websocket.receive_text()
            # We don't expect clients to send data, but we need to listen to detect disconnection
    except WebSocketDisconnect:
        manager.disconnect(user_id)
