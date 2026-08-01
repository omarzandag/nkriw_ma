import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { commentsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { FaHeart, FaReply, FaEdit, FaTrash, FaPaperPlane, FaUserCircle } from 'react-icons/fa'
import toast from 'react-hot-toast'
import './Comments.css'

export default function Comments({ contentType, contentId }) {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  const fetchComments = async () => {
    try {
      const response = await commentsAPI.list(contentType, contentId)
      setComments(response.data)
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchComments()
  }, [contentType, contentId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      await commentsAPI.create(contentType, contentId, { content: newComment })
      setNewComment('')
      fetchComments()
      toast.success('Comment added')
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const handleReply = async (parentId) => {
    if (!replyText.trim()) return
    try {
      await commentsAPI.create(contentType, contentId, { content: replyText, parent_id: parentId })
      setReplyText('')
      setReplyingTo(null)
      fetchComments()
      toast.success('Reply added')
    } catch (error) {
      toast.error('Failed to add reply')
    }
  }

  const handleEdit = async (commentId) => {
    if (!editText.trim()) return
    try {
      await commentsAPI.update(commentId, { content: editText })
      setEditingId(null)
      fetchComments()
      toast.success('Comment updated')
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await commentsAPI.delete(commentId)
      fetchComments()
      toast.success('Comment deleted')
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const handleLike = async (commentId) => {
    try {
      await commentsAPI.toggleLike(commentId)
      fetchComments()
    } catch (error) {
      toast.error('Failed to like')
    }
  }

  const renderComment = (comment, isReply = false) => {
    const isOwner = user && (user.id === comment.user_id || user.is_admin)
    return (
      <div key={comment.id} className={`comment-item ${isReply ? 'reply' : ''}`}>
        <div className="comment-header">
          <div className="comment-author-info">
            {comment.profile_picture ? (
              <Link to={`/users/${comment.username}`}>
                <img src={comment.profile_picture} alt={comment.username} className="comment-avatar" />
              </Link>
            ) : (
              <Link to={`/users/${comment.username}`}>
                <div className="comment-avatar-placeholder">
                  <FaUserCircle />
                </div>
              </Link>
            )}
            <Link to={`/users/${comment.username}`} className="comment-author">
              {comment.username || 'User'}
            </Link>
          </div>
          <span className="comment-date text-sm text-gray">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
        </div>
        {editingId === comment.id ? (
          <div className="comment-edit">
            <textarea
              className="form-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <div className="flex gap-sm mt-2">
              <button className="btn btn-primary btn-sm" onClick={() => handleEdit(comment.id)}>{t('common.save')}</button>
              <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <p className="comment-content">{comment.content}</p>
        )}
        <div className="comment-actions">
          <button className="comment-action-btn" onClick={() => handleLike(comment.id)}>
            <FaHeart className={comment.liked_by_me ? 'liked' : ''} /> {comment.likes_count}
          </button>
          {isAuthenticated && (
            <button className="comment-action-btn" onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
              <FaReply /> {t('forum.reply')}
            </button>
          )}
          {isOwner && (
            <>
              <button className="comment-action-btn" onClick={() => { setEditingId(comment.id); setEditText(comment.content) }}>
                <FaEdit /> {t('common.edit')}
              </button>
              <button className="comment-action-btn" onClick={() => handleDelete(comment.id)}>
                <FaTrash /> {t('common.delete')}
              </button>
            </>
          )}
        </div>
        {replyingTo === comment.id && (
          <div className="reply-form">
            <textarea
              className="form-textarea"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t('forum.reply')}
            />
            <div className="flex gap-sm mt-2">
              <button className="btn btn-primary btn-sm" onClick={() => handleReply(comment.id)}>{t('common.submit')}</button>
              <button className="btn btn-outline btn-sm" onClick={() => setReplyingTo(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div className="replies-list">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="comments-section">
      <h3 className="font-semibold mb-3">{t('common.comments')}</h3>
      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="comment-form mb-4">
          <textarea
            className="form-textarea"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('common.submit')}
          />
          <button type="submit" className="btn btn-primary mt-2">
            <FaPaperPlane /> {t('common.submit')}
          </button>
        </form>
      )}
      {loading ? (
        <div className="loading-container"><div className="spinner"></div></div>
      ) : comments.length === 0 ? (
        <p className="text-gray text-sm">{t('common.noResults')}</p>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  )
}