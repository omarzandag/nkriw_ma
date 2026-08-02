import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { messagingAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaPaperPlane, FaBan, FaTrash, FaUserCircle, FaArrowLeft, FaCheck, FaCheckDouble } from 'react-icons/fa'
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
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const [isMobileView, setIsMobileView] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState(null)
  const wsRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const lastTypingSentRef = useRef(0)

  const fetchConversations = useCallback(async () => {
    try {
      const response = await messagingAPI.listConversations()
      setConversations(response.data)
    } catch (error) { console.error('Failed:', error) }
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return
    try {
      const response = await messagingAPI.getMessages(conversationId, { per_page: 100 })
      setMessages(response.data.items)
      scrollToBottom()
    } catch (error) { console.error('Failed:', error) }
    setLoading(false)
  }, [conversationId])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => { fetchMessages() }, [fetchMessages, conversationId])

  // Mark conversation as read when opened
  useEffect(() => {
    if (conversationId) {
      messagingAPI.markConversationRead(conversationId)
        .then(() => {
          fetchConversations()
          // Dispatch custom event so Navbar can update its badge in real-time
          window.dispatchEvent(new CustomEvent('messages-read', { detail: { conversationId } }))
        })
        .catch(() => {})
    }
  }, [conversationId, fetchConversations])

  // WebSocket connection for real-time messages
  useEffect(() => {
    if (!user?.id) return

    const token = localStorage.getItem('nkriwma_token')
    if (!token) return

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/messaging/ws/${user.id}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

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
            
            // Send read confirmation back to sender via WebSocket
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'message_read',
                message_id: newMsg.id,
                conversation_id: newMsg.conversation_id
              }))
            }
            
            // We just read this message - update navbar badge
            window.dispatchEvent(new CustomEvent('messages-read', { detail: { conversationId: newMsg.conversation_id } }))
          }
          
          // Refresh conversations list to update last message and unread count
          fetchConversations()
        } else if (data.type === 'messages_read') {
          // The other user read our messages - update read status
          if (data.conversation_id === conversationId) {
            setMessages(prev => prev.map(msg => 
              msg.sender_id === user?.id && !msg.is_read
                ? { ...msg, is_read: true, read_at: data.read_at }
                : msg
            ))
          }
          fetchConversations()
        } else if (data.type === 'message_read') {
          // A specific message was read
          if (data.conversation_id === conversationId) {
            setMessages(prev => prev.map(msg => 
              msg.id === data.message_id
                ? { ...msg, is_read: true, read_at: data.read_at }
                : msg
            ))
          }
          fetchConversations()
        } else if (data.type === 'typing') {
          // Other user is typing
          if (data.conversation_id === conversationId) {
            setOtherUserTyping(data.is_typing)
          }
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
  }, [user?.id, conversationId, fetchConversations])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Send typing indicator
  const sendTypingIndicator = (isTyping) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !conversationId) return
    
    // Throttle typing events to avoid spamming
    const now = Date.now()
    if (isTyping && now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now

    wsRef.current.send(JSON.stringify({
      type: 'typing',
      conversation_id: conversationId,
      is_typing: isTyping
    }))
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    
    // Send typing indicator
    sendTypingIndicator(true)
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Send "stopped typing" after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false)
    }, 2000)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    
    // Send "stopped typing" indicator
    sendTypingIndicator(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Create temporary message for immediate display
    const tempMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: null,
      content: newMessage,
      is_read: false,
      is_delivered: false,
      read_at: null,
      created_at: new Date().toISOString()
    }
    
    // Add message immediately to UI
    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')
    setIsSending(true)
    scrollToBottom()
    
    try {
      const response = await messagingAPI.sendMessage(conversationId, { content: newMessage })
      // Replace the temporary message with the real one from server
      const realMessage = response.data
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? realMessage : msg
      ))
      setIsSending(false)
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
                    {otherUserTyping && (
                      <span className="typing-status-text">{t('messaging.typing')}...</span>
                    )}
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
                      <span className="message-meta">
                        <span className="message-time text-sm">{new Date(msg.created_at).toLocaleTimeString()}</span>
                        {msg.sender_id === user?.id && (
                          <span className={`message-status ${msg.is_read ? 'read' : ''}`} title={msg.is_read ? t('messaging.read') : t('messaging.delivered')}>
                            {msg.is_read ? <FaCheckDouble /> : <FaCheck />}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  {otherUserTyping && (
                    <div className="typing-indicator received-typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )}
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
                    onChange={handleInputChange}
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