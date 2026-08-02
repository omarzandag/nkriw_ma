import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { notificationsAPI, messagingAPI } from '../services/api'
import {
  FaHome, FaBuilding, FaUsers, FaCar, FaComments, FaUser,
  FaBell, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaBars, FaTimes,
  FaCog, FaShieldAlt, FaGlobe,
} from 'react-icons/fa'
import './Navbar.css'

export default function Navbar() {
  const { t } = useTranslation()
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const navbarRef = useRef(null)

  const { i18n } = useTranslation()

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    setLangMenuOpen(false)
  }

  const currentLang = i18n.language?.substring(0, 2) || 'en'

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadNotificationsCount()
      fetchUnreadMessagesCount()
      const interval = setInterval(() => {
        fetchUnreadNotificationsCount()
        fetchUnreadMessagesCount()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  // Close all dropdowns when clicking outside the navbar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setNotificationsOpen(false)
        setUserMenuOpen(false)
        setLangMenuOpen(false)
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchUnreadNotificationsCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount()
      setUnreadNotificationsCount(response.data.unread_count)
    } catch (error) {
      console.error('Failed to fetch unread notifications count:', error)
    }
  }

  const fetchUnreadMessagesCount = async () => {
    try {
      const response = await messagingAPI.getUnreadCount()
      setUnreadMessagesCount(response.data.unread_count)
    } catch (error) {
      console.error('Failed to fetch unread messages count:', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.list({ per_page: 5 })
      setNotifications(response.data.items)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const handleNotificationClick = async () => {
    setNotificationsOpen(!notificationsOpen)
    if (!notificationsOpen) {
      await fetchNotifications()
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setUserMenuOpen(false)
  }

  const navLinks = [
    { to: '/', label: t('nav.home'), icon: <FaHome /> },
    { to: '/housing', label: t('nav.housing'), icon: <FaBuilding /> },
    { to: '/colocation', label: t('nav.colocation'), icon: <FaUsers /> },
    { to: '/carpool', label: t('nav.carpool'), icon: <FaCar /> },
    { to: '/forum', label: t('nav.forum'), icon: <FaComments /> },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="navbar" ref={navbarRef}>
      <div className="navbar-inner">
        <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-text">NKRIW<span className="brand-accent">.MA</span></span>
        </Link>

        {/* Desktop nav links */}
        <ul className="navbar-nav hide-mobile">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side actions */}
        <div className="navbar-actions">
          {/* Language switcher */}
          <div className="dropdown">
            <button className="icon-btn" onClick={() => setLangMenuOpen(!langMenuOpen)}>
              <FaGlobe />
            </button>
            {langMenuOpen && (
              <div className="dropdown-menu">
                <button className={`dropdown-item ${currentLang === 'en' ? 'active' : ''}`} onClick={() => changeLanguage('en')}>English</button>
                <button className={`dropdown-item ${currentLang === 'fr' ? 'active' : ''}`} onClick={() => changeLanguage('fr')}>Français</button>
                <button className={`dropdown-item ${currentLang === 'ar' ? 'active' : ''}`} onClick={() => changeLanguage('ar')}>العربية</button>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <>
              {/* Notifications */}
               <div className="dropdown">
                 <button className="icon-btn" onClick={handleNotificationClick}>
                   <FaBell />
                   {unreadNotificationsCount > 0 && <span className="badge-count">{unreadNotificationsCount}</span>}
                 </button>
                {notificationsOpen && (
                  <div className="dropdown-menu notifications-menu">
                    <div className="notifications-header">
                      <span className="font-semibold">{t('notifications.title')}</span>
                      <Link to="/notifications" onClick={() => setNotificationsOpen(false)}>{t('common.viewAll')}</Link>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="empty-state text-sm">{t('notifications.noNotifications')}</div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className={`notification-item ${!notif.is_read ? 'unread' : ''}`}>
                          <p className="font-semibold text-sm">{notif.title}</p>
                          {notif.body && <p className="text-sm text-gray">{notif.body}</p>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
               <Link to="/messages" className="icon-btn">
                 <FaComments />
                 {unreadMessagesCount > 0 && <span className="badge-count">{unreadMessagesCount}</span>}
               </Link>

              {/* User menu */}
              <div className="dropdown">
                <button className="icon-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                  {user?.profile_picture ? (
                    <img src={user.profile_picture} alt="profile" className="nav-avatar" />
                  ) : (
                    <FaUser />
                  )}
                </button>
                {userMenuOpen && (
                  <div className="dropdown-menu user-menu">
                    <div className="user-menu-header">
                      <p className="font-semibold">{user?.full_name}</p>
                      <p className="text-sm text-gray">@{user?.username}</p>
                    </div>
                    <Link to="/profile" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <FaUser /> {t('common.profile')}
                    </Link>
                    <Link to="/profile/edit" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <FaCog /> {t('profile.editProfile')}
                    </Link>
                    {user?.is_admin && (
                      <Link to="/admin" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                        <FaShieldAlt /> {t('common.dashboard')}
                      </Link>
                    )}
                    <button className="dropdown-item" onClick={handleLogout}>
                      <FaSignOutAlt /> {t('common.logout')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hide-mobile flex gap-sm">
              <Link to="/login" className="btn btn-outline btn-sm">
                <FaSignInAlt /> {t('common.login')}
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                <FaUserPlus /> {t('common.register')}
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button className="icon-btn mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <ul>
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
              {!isAuthenticated && (
                <>
                  <li>
                    <Link to="/login" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                      <FaSignInAlt /> <span>{t('common.login')}</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                      <FaUserPlus /> <span>{t('common.register')}</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>
      </div>
    </nav>
  )
}
