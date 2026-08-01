import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersAPI, messagingAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaEdit, FaMapMarkerAlt, FaCalendarAlt, FaHome, FaComments, FaComment, FaPaperPlane } from 'react-icons/fa'
import toast from 'react-hot-toast'
import './Profile.css'

export default function ProfilePage() {
  const { username } = useParams()
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (username) {
          const response = await usersAPI.getPublicProfile(username)
          setProfile(response.data)
        } else if (currentUser) {
          const response = await usersAPI.getProfile()
          setProfile(response.data)
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [username, currentUser])

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!profile) return <div className="empty-state"><h3>Profile not found</h3></div>

  const isOwnProfile = currentUser && currentUser.id === profile.id

  const handleStartMessage = async () => {
    try {
      await messagingAPI.startConversation(profile.id, { content: 'Hello!' })
      toast.success('Conversation started')
      navigate('/messages')
    } catch (error) {
      toast.error('Failed to start conversation')
    }
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="profile-header">
          <div className="profile-cover">
            {profile.cover_picture ? (
              <img src={profile.cover_picture} alt="cover" />
            ) : (
              <div className="cover-placeholder"></div>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-avatar">
              {profile.profile_picture ? (
                <img src={profile.profile_picture} alt={profile.username} />
              ) : (
                <div className="avatar-placeholder">{profile.full_name?.charAt(0)?.toUpperCase()}</div>
              )}
            </div>
            <div className="profile-details">
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              <p className="text-gray">@{profile.username}</p>
              {profile.city && <p className="text-sm text-gray mt-1"><FaMapMarkerAlt /> {profile.city}</p>}
              {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
            </div>
            {isOwnProfile && (
              <Link to="/profile/edit" className="btn btn-outline"><FaEdit /> {t('profile.editProfile')}</Link>
            )}
            {!isOwnProfile && currentUser && (
              <button onClick={handleStartMessage} className="btn btn-primary">
                <FaPaperPlane /> {t('messaging.sendMessage')}
              </button>
            )}
          </div>
        </div>

        <div className="profile-stats grid grid-4 mt-4">
          <div className="card">
            <div className="card-body text-center">
              <FaHome className="text-primary text-xl mb-1" />
              <p className="text-2xl font-bold">{profile.housing_ads_count}</p>
              <p className="text-sm text-gray">{t('profile.publishedAds')}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <FaComments className="text-primary text-xl mb-1" />
              <p className="text-2xl font-bold">{profile.forum_posts_count}</p>
              <p className="text-sm text-gray">{t('profile.forumPosts')}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <FaComment className="text-primary text-xl mb-1" />
              <p className="text-2xl font-bold">{profile.comments_count}</p>
              <p className="text-sm text-gray">{t('profile.comments')}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <FaCalendarAlt className="text-primary text-xl mb-1" />
              <p className="text-2xl font-bold">{new Date(profile.join_date).getFullYear()}</p>
              <p className="text-sm text-gray">{t('profile.joinDate')}</p>
            </div>
          </div>
        </div>

        <div className="card mt-4">
          <div className="card-body">
            <h3 className="font-semibold mb-3">Information</h3>
            <div className="grid grid-2">
              {profile.email && isOwnProfile && (
                <div><strong>{t('profile.email')}:</strong> {profile.email}</div>
              )}
              {profile.gender && (
                <div><strong>{t('profile.gender')}:</strong> {t(`profile.${profile.gender}`)}</div>
              )}
              {profile.date_of_birth && (
                <div><strong>{t('profile.dateOfBirth')}:</strong> {new Date(profile.date_of_birth).toLocaleDateString()}</div>
              )}
              {profile.last_active && (
                <div><strong>{t('profile.lastActive')}:</strong> {new Date(profile.last_active).toLocaleDateString()}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}