import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { notificationsAPI } from '../../services/api'
import { FaBell, FaCheck, FaTrash, FaTimes } from 'react-icons/fa'
import toast from 'react-hot-toast'
import Pagination from '../../components/Pagination'
import './Notifications.css'

export default function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchNotifications = async (pageNum = 1) => {
    setLoading(true)
    try {
      const response = await notificationsAPI.list({ page: pageNum, per_page: 20 })
      setNotifications(response.data.items)
      setTotalPages(response.data.pages)
      setTotal(response.data.total)
    } catch (error) {
      toast.error('Failed to load notifications')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
      toast.success(t('notifications.markAllRead'))
    } catch (error) {
      toast.error('Failed')
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id)
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ))
    } catch (error) {
      toast.error('Failed')
    }
  }

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id)
      setNotifications(notifications.filter(n => n.id !== id))
      toast.success('Deleted')
    } catch (error) {
      toast.error('Failed')
    }
  }

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      handleMarkRead(notif.id)
    }
    if (notif.link) {
      navigate(notif.link)
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>

  return (
    <div className="page-container">
      <div className="container">
        <div className="notifications-header">
          <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
          <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>
            <FaCheck /> {t('notifications.markAllRead')}
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <FaBell className="text-4xl text-gray mb-3" />
            <h3>{t('notifications.noNotifications')}</h3>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="notification-content">
                  <p className="font-semibold">{notif.title}</p>
                  {notif.body && <p className="text-sm text-gray">{notif.body}</p>}
                  <p className="text-xs text-gray mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="notification-actions">
                  {!notif.is_read && <span className="unread-dot"></span>}
                  <button
                    className="icon-btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id) }}
                    title={t('common.save')}
                  >
                    <FaCheck />
                  </button>
                  <button
                    className="icon-btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(notif.id) }}
                    title={t('common.delete')}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={fetchNotifications} />
        )}
      </div>
    </div>
  )
}
