import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersAPI, messagingAPI, carpoolAPI } from '../../services/api'
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

  const [myReservations, setMyReservations] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])

  const isOwnProfile = currentUser && profile && currentUser.id === profile.id

  const fetchUserBookings = async () => {
    try {
      const res1 = await carpoolAPI.getMyReservations()
      setMyReservations(res1.data)
      const res2 = await carpoolAPI.getMyIncomingRequests()
      setIncomingRequests(res2.data)
    } catch (e) {
      console.error('Failed to load bookings:', e)
    }
  }

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

  useEffect(() => {
    fetchProfile()
  }, [username, currentUser])

  useEffect(() => {
    if (isOwnProfile) {
      fetchUserBookings()
    }
  }, [profile])

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Annuler cette réservation ?')) return
    try {
      await carpoolAPI.cancelBooking(bookingId)
      toast.success(t('carpool.bookingCancelled'))
      await fetchUserBookings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    }
  }

  const handleAcceptBooking = async (bookingId) => {
    try {
      await carpoolAPI.acceptBooking(bookingId)
      toast.success('Demande acceptée !')
      await fetchUserBookings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    }
  }

  const handleRejectBooking = async (bookingId) => {
    try {
      await carpoolAPI.rejectBooking(bookingId)
      toast.success('Demande refusée')
      await fetchUserBookings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!profile) return <div className="empty-state"><h3>Profile not found</h3></div>
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

        <div className="card mt-4 info-card-anim">
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

        {isOwnProfile && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {/* My Reservations Card */}
            <div className="card">
              <div className="card-body">
                <h3 className="font-semibold mb-3">{t('carpool.myReservations')}</h3>
                {myReservations.length === 0 ? (
                  <p className="text-gray text-sm">Aucune réservation de trajet soumise.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {myReservations.map(r => (
                      <div key={r.id} style={{ borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div className="font-bold text-sm">
                              {r.departure_city} &rarr; {r.destination_city}
                            </div>
                            <span className="text-xs text-gray" style={{ display: 'block', marginTop: '4px' }}>
                              Date: {new Date(r.departure_date).toLocaleDateString()} | Places: {r.seats_requested}
                            </span>
                          </div>
                          <span className={`badge badge-${r.status === 'accepted' ? 'success' : r.status === 'pending' ? 'warning' : r.status === 'rejected' ? 'danger' : 'gray'}`}>
                            {t(`carpool.${r.status}`)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                          <span className="text-xs text-gray">Cond. @{r.driver_username}</span>
                          {(r.status === 'pending' || r.status === 'accepted') && (
                            <button
                              onClick={() => handleCancelBooking(r.id)}
                              className="btn btn-outline btn-sm text-danger"
                              style={{ padding: '2px 8px', fontSize: '11px', borderColor: 'var(--color-danger)' }}
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Received Reservation Requests Card */}
            <div className="card">
              <div className="card-body">
                <h3 className="font-semibold mb-3">{t('carpool.incomingRequests')}</h3>
                {incomingRequests.length === 0 ? (
                  <p className="text-gray text-sm">Aucune demande reçue pour vos trajets.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {incomingRequests.map(r => (
                      <div key={r.id} style={{ borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div className="font-bold text-sm">
                              {r.departure_city} &rarr; {r.destination_city}
                            </div>
                            <span className="text-xs text-gray" style={{ display: 'block', marginTop: '4px' }}>
                              Passager: <Link to={`/users/${r.passenger_username}`}>@{r.passenger_username}</Link> | Places: {r.seats_requested}
                            </span>
                          </div>
                          <span className={`badge badge-${r.status === 'accepted' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}`}>
                            {t(`carpool.${r.status}`)}
                          </span>
                        </div>
                        {r.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button
                              onClick={() => handleAcceptBooking(r.id)}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '11px' }}
                            >
                              Accepter
                            </button>
                            <button
                              onClick={() => handleRejectBooking(r.id)}
                              className="btn btn-outline btn-sm text-danger"
                              style={{ padding: '2px 8px', fontSize: '11px', borderColor: 'var(--color-danger)' }}
                            >
                              Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}