import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { forumAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaHeart, FaEdit, FaTrash, FaPaperPlane, FaThumbtack, FaLock, FaBell, FaBellSlash, FaReply } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function ForumThreadPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [thread, setThread] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [newReply, setNewReply] = useState('')
  const [editingReply, setEditingReply] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  const fetchData = async () => {
    try {
      const [threadRes, repliesRes] = await Promise.all([
        forumAPI.getThread(id),
        forumAPI.listReplies(id, { per_page: 100 }),
      ])
      setThread(threadRes.data)
      setIsFollowing(threadRes.data.is_following || false)
      setFollowersCount(threadRes.data.followers_count || 0)
      setReplies(repliesRes.data.items)
    } catch (error) { toast.error('Failed to load') }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const buildReplyTree = (flatReplies) => {
    const replyMap = {}
    const roots = []
    flatReplies.forEach((reply) => {
      replyMap[reply.id] = { ...reply, children: [] }
    })
    flatReplies.forEach((reply) => {
      if (reply.parent_id && replyMap[reply.parent_id]) {
        replyMap[reply.parent_id].children.push(replyMap[reply.id])
      } else {
        roots.push(replyMap[reply.id])
      }
    })
    return roots
  }

  const handleReply = async (e, parentId = null) => {
    e.preventDefault()
    const content = parentId ? replyText : newReply
    if (!content.trim()) return
    try {
      await forumAPI.createReply(id, { content, parent_id: parentId })
      if (parentId) {
        setReplyText('')
        setReplyingTo(null)
      } else {
        setNewReply('')
      }
      fetchData()
      toast.success('Reply added')
    } catch (error) { toast.error('Failed') }
  }

  const handleLike = async (replyId) => {
    try { await forumAPI.toggleReplyLike(replyId); fetchData() }
    catch (error) { toast.error('Failed') }
  }

  const handleEditReply = async (replyId) => {
    try { await forumAPI.updateReply(replyId, { content: editText }); setEditingReply(null); fetchData(); toast.success('Updated') }
    catch (error) { toast.error('Failed') }
  }

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Delete this reply?')) return
    try { await forumAPI.deleteReply(replyId); fetchData(); toast.success('Deleted') }
    catch (error) { toast.error('Failed') }
  }

  const handleDeleteThread = async () => {
    if (!window.confirm('Delete this thread?')) return
    try { await forumAPI.deleteThread(id); toast.success('Deleted'); navigate('/forum') }
    catch (error) { toast.error('Failed') }
  }

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setFollowLoading(true)
    try {
      if (isFollowing) {
        const res = await forumAPI.unfollowThread(id)
        setIsFollowing(false)
        setFollowersCount(res.data.followers_count)
        toast.success('Unfollowed')
      } else {
        const res = await forumAPI.followThread(id)
        setIsFollowing(true)
        setFollowersCount(res.data.followers_count)
        toast.success('Following')
      }
    } catch (error) { toast.error('Failed') }
    setFollowLoading(false)
  }

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!thread) return <div className="empty-state"><h3>Not found</h3></div>

  const isOwner = user && (user.id === thread.user_id || user.is_admin)
  const replyTree = buildReplyTree(replies)

  const renderReply = (reply, depth = 0) => {
    const replyOwner = user && (user.id === reply.user_id || user.is_admin)
    const parentReply = reply.parent_id ? replies.find((r) => r.id === reply.parent_id) : null
    return (
      <div key={reply.id} className={depth > 0 ? 'reply-nested' : ''}>
        <div className="card mb-3">
          <div className="card-body">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-sm">
                {reply.profile_picture ? (
                  <Link to={`/users/${reply.username}`}>
                    <img src={reply.profile_picture} alt={reply.username} className="reply-avatar" />
                  </Link>
                ) : (
                  <Link to={`/users/${reply.username}`}>
                    <div className="reply-avatar-placeholder">{reply.username?.charAt(0)?.toUpperCase()}</div>
                  </Link>
                )}
                <Link to={`/users/${reply.username}`} className="font-semibold text-sm">
                  {reply.username || 'User'}
                </Link>
                {parentReply && (
                  <span className="reply-to-indicator">
                    <FaReply /> {parentReply.username}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray">{new Date(reply.created_at).toLocaleDateString()}</span>
            </div>
            {editingReply === reply.id ? (
              <div>
                <textarea className="form-textarea" value={editText} onChange={(e) => setEditText(e.target.value)} />
                <div className="flex gap-sm mt-2">
                  <button className="btn btn-primary btn-sm" onClick={() => handleEditReply(reply.id)}>{t('common.save')}</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditingReply(null)}>{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <p>{reply.content}</p>
            )}
            <div className="flex gap-md mt-3">
              <button className="comment-action-btn" onClick={() => handleLike(reply.id)}>
                <FaHeart className={reply.liked_by_me ? 'liked' : ''} /> {reply.likes_count}
              </button>
              {isAuthenticated && !thread.is_closed && (
                <button
                  className="comment-action-btn"
                  onClick={() => {
                    setReplyingTo(replyingTo === reply.id ? null : reply.id)
                    setReplyText('')
                    setEditingReply(null)
                  }}
                >
                  <FaReply /> {t('forum.reply')}
                </button>
              )}
              {replyOwner && (
                <>
                  <button className="comment-action-btn" onClick={() => { setEditingReply(reply.id); setEditText(reply.content); setReplyingTo(null) }}>
                    <FaEdit /> {t('common.edit')}
                  </button>
                  <button className="comment-action-btn" onClick={() => handleDeleteReply(reply.id)}>
                    <FaTrash /> {t('common.delete')}
                  </button>
                </>
              )}
            </div>
            {replyingTo === reply.id && (
              <form onSubmit={(e) => handleReply(e, reply.id)} className="mt-3">
                <textarea
                  className="form-textarea"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`${t('forum.replyTo')} ${reply.username}...`}
                  required
                  autoFocus
                />
                <div className="flex gap-sm mt-2">
                  <button type="submit" className="btn btn-primary btn-sm"><FaPaperPlane /> {t('common.submit')}</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setReplyingTo(null); setReplyText('') }}>{t('common.cancel')}</button>
                </div>
              </form>
            )}
          </div>
        </div>
        {reply.children && reply.children.length > 0 && (
          <div className="reply-children">
            {reply.children.map((child) => renderReply(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="container">
        <Link to="/forum" className="text-sm mb-3 inline-block">&larr; {t('common.back')}</Link>
        <div className="card mb-4">
          <div className="card-body">
            <div className="flex items-center gap-sm mb-2">
              {thread.is_pinned && <FaThumbtack className="text-accent" />}
              {thread.is_closed && <FaLock className="text-error" />}
              <span className="badge badge-info">{t(`forum.categories.${thread.category}`)}</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{thread.title}</h1>
            <div className="flex items-center gap-sm text-gray text-sm mb-3">
              {thread.author_profile_picture ? (
                <Link to={`/users/${thread.author_username}`}>
                  <img src={thread.author_profile_picture} alt={thread.author_username} className="reply-avatar" />
                </Link>
              ) : (
                <Link to={`/users/${thread.author_username}`}>
                  <div className="reply-avatar-placeholder">{thread.author_username?.charAt(0)?.toUpperCase()}</div>
                </Link>
              )}
              <Link to={`/users/${thread.author_username}`} className="text-gray hover:text-primary">
                {thread.author_username || 'User'}
              </Link>
              <span>·</span>
              <span>{new Date(thread.created_at).toLocaleDateString()}</span>
              <span>·</span>
              <span>{thread.views} views</span>
            </div>
            <div className="thread-content">{thread.content}</div>
            <div className="flex gap-sm mt-4 flex-wrap">
              {isAuthenticated && (
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`btn btn-sm ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                >
                  {isFollowing ? <><FaBellSlash /> {t('forum.unfollow')}</> : <><FaBell /> {t('forum.follow')}</>}
                  <span className="ml-1">({followersCount})</span>
                </button>
              )}
              {isOwner && (
                <>
                  <Link to={`/forum/${id}/edit`} className="btn btn-outline btn-sm"><FaEdit /> {t('common.edit')}</Link>
                  <button onClick={handleDeleteThread} className="btn btn-danger btn-sm"><FaTrash /> {t('common.delete')}</button>
                </>
              )}
            </div>
          </div>
        </div>

        <h3 className="font-semibold mb-3">{t('forum.replies')} ({replies.length})</h3>
        <div className="replies-list">
          {replyTree.length === 0 ? (
            <p className="text-gray">{t('forum.noReplies')}</p>
          ) : (
            replyTree.map((reply) => renderReply(reply))
          )}
        </div>

        {isAuthenticated && !thread.is_closed && (
          <form onSubmit={(e) => handleReply(e)} className="card mt-4">
            <div className="card-body">
              <h3 className="font-semibold mb-2">{t('forum.reply')}</h3>
              <textarea className="form-textarea" value={newReply} onChange={(e) => setNewReply(e.target.value)} required />
              <button type="submit" className="btn btn-primary mt-2"><FaPaperPlane /> {t('common.submit')}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}