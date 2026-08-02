import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { messagingAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaPaperPlane, FaBan, FaTrash, FaUserCircle, FaArrowLeft } from 'react-icons/fa'
import toast from 'react-hot-toast'
import './Messaging.css'

export default function MessagesPage() {
  const { conversationId } = useParams()
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)
  const [isMobileView, setIsMobileView] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState(null)

  const fetchConversations = async () => {
    try {
      const response = await messagingAPI.listConversations()
      setConversations(response.data)
    } catch (error) { console.error('Failed:', error) }
  }

  const fetchMessages = async () => {
    if (!conversationId) return
    try {
      const response = await messagingAPI.getMessages(conversationId, { per_page: 100 })
      setMessages(response.data.items)
      scrollToBottom()
    } catch (error) { console.error('Failed:', error) }
    setLoading(false)
  }

  useEffect(() => { fetchConversations() }, [])

  useEffect(() => { fetchMessages() }, [conversationId])

  // WebSocket connection for real-time messages
  useEffect(() => {
    if (!user?.id) return

    const token = localStorage.getItem('nkriwma_token')
    if (!token) return

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/messaging/ws/${user.id}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

   ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'new_message') {
          const newMsg = data.message
          
          // If we're viewing the conversation this message belongs to, add it to the list
          if (conversationId === newMsg.conversation_id) {
            setMessages(prev => {
              // Remove any temporary messages and add the real one
              const filtered = prev.filter(msg => !msg.id.toString().includes('temp'))
              return [...filtered, newMsg]
            })
            // Highlight the new message
            setHighlightedMessageId(newMsg.id)
            setTimeout(() => setHighlightedMessageId(null), 2000)
            setIsSending(false)
            scrollToBottom()
          }
          
          // Refresh conversations list to update last message and unread count
          fetchConversations()
        }
      } catch (error) {
        console.error('WebSocket message error:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [user?.id, conversationId])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    
    // Create temporary message for immediate display
    const tempMessage = {
      id: Date.now(), // Temporary ID
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: null,
      content: newMessage,
      is_read: false,
      is_delivered: false,
      created_at: new Date().toISOString()
    }
    
    // Add message immediately to UI
    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')
    setIsSending(true)
    scrollToBottom()
    
    try {
      await messagingAPI.sendMessage(conversationId, { content: newMessage })
      // Message will be confirmed via WebSocket - no need to refresh
    } catch (error) {
      toast.error('Failed to send')
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
      setIsSending(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this conversation?')) return
    try { await messagingAPI.deleteConversation(conversationId); toast.success('Deleted'); navigate('/messages') }
    catch (error) { toast.error('Failed') }
  }

  const handleBlock = async () => {
    try { 
      await messagingAPI.blockUser(conversationId); 
      toast.success('User blocked'); 
      fetchConversations()
    } 
    catch (error) { toast.error('Failed') }
  }

  const handleUnblock = async () => {
    try { 
      await messagingAPI.unblockUser(conversationId); 
      toast.success('User unblocked'); 
      fetchConversations()
    } 
    catch (error) { toast.error('Failed') }
  }

  const handleBackToConversations = () => {
    navigate('/messages')
  }

  // Check if conversation is blocked
  const currentConversation = conversations.find(c => c.id === conversationId)
  const isBlocked = currentConversation?.blocked_by !== null && currentConversation?.blocked_by !== undefined

  if (loading && conversationId) return <div className="loading-container"><div className="spinner"></div></div>

  return (
    <div className="page-container">
      <div style={{ padding: '0', maxWidth: '100%', width: '100%' }}>
        <h1 className="text-2xl font-bold mb-4">{t('messaging.title')}</h1>
        <div className={`messaging-container ${conversationId ? 'has-active-chat' : ''}`} style={{ margin: '0' }}>
          {/* Conversations list */}
          <div className="conversations-list">
            <div className="conversations-list-header">
              {t('messaging.conversations')}
            </div>
            <div className="conversations-list-content">
              {conversations.length === 0 ? (
                <p className="text-gray text-sm p-4">{t('messaging.noConversations')}</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`conversation-item ${conversationId === conv.id ? 'active' : ''}`}
                    onClick={() => navigate(`/messages/${conv.id}`)}
                  >
                    <div className="conversation-avatar">
                      {conv.other_user_profile_picture ? (
                        <img src={conv.other_user_profile_picture} alt={conv.other_user_username} />
                      ) : (
                        <FaUserCircle />
                      )}
                    </div>
                    <div className="conversation-info">
                      <p className="font-semibold text-sm">@{conv.other_user_username}</p>
                      <p className="text-sm text-gray truncate">{conv.last_message || t('messaging.noMessages')}</p>
                    </div>
                    {conv.unread_count > 0 && <span className="badge-count">{conv.unread_count}</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Messages area */}
          <div className="messages-area">
            {conversationId ? (
              <>
                <div className="messages-header">
                  <div className="flex items-center">
                    <button onClick={handleBackToConversations} className="mobile-back-button">
                      <FaArrowLeft /> {t('common.back')}
                    </button>
                    <span className="font-semibold">
                      {conversations.find(c => c.id === conversationId)?.other_user_username || 'Chat'}
                    </span>
                  </div>
                  <div className="flex gap-sm">
                    {isBlocked ? (
                      <button onClick={handleUnblock} className="btn btn-outline btn-sm">
                        <FaBan /> {t('messaging.unblockUser')}
                      </button>
                    ) : (
                      <button onClick={handleBlock} className="btn btn-outline btn-sm">
                        <FaBan /> {t('messaging.blockUser')}
                      </button>
                    )}
                    <button onClick={handleDelete} className="btn btn-danger btn-sm"><FaTrash /> {t('common.delete')}</button>
                  </div>
                </div>
                <div className="messages-list">
                  {messages.map((msg, index) => (
                    <div key={msg.id} className={`message-bubble ${msg.sender_id === user?.id ? 'sent' : 'received'} anim-msg-in ${highlightedMessageId === msg.id ? 'message-highlight' : ''}`} style={{ animationDelay: `${Math.min(index * 0.02, 0.3)}s` }}>
                      <p>{msg.content}</p>
                      <span className="message-time text-sm">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {isSending && (
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="message-input-form">
                  <input
                    type="text"
                    className="form-input"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('messaging.typeMessage')}
                  />
                  <button type="submit" className="btn btn-primary"><FaPaperPlane /></button>
                </form>
              </>
            ) : (
              <div className="empty-state">
                <h3>{t('messaging.startConversation')}</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}