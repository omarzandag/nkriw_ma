import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { carpoolAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaCalendarAlt, FaClock, FaChair, FaCar, FaPhone, FaEdit, FaTrash, FaCheck, FaMapMarkerAlt, FaUser } from 'react-icons/fa'
import toast from 'react-hot-toast'
import Comments from '../../components/Comments'
import '../housing/Housing.css'

export default function CarpoolDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ad, setAd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState([])
  const [myBooking, setMyBooking] = useState(null)
  const [seatsToBook, setSeatsToBook] = useState(1)

  const isOwner = user && ad && (user.id === ad.user_id || user.is_admin)

  const fetchAd = async () => {
    try {
      const response = await carpoolAPI.get(id)
      setAd(response.data)
    } catch (error) {
      toast.error('Failed to load ad details')
    }
  }

  const fetchBookings = async () => {
    try {
      const res = await carpoolAPI.getBookings(id)
      setBookings(res.data)
    } catch (err) {
      console.error('Failed to load bookings details', err)
    }
  }

  const fetchMyBooking = async () => {
    try {
      const res = await carpoolAPI.getMyReservations()
      const booking = res.data.find(b => b.carpool_ad_id === id && ['pending', 'accepted'].includes(b.status))
      setMyBooking(booking || null)
    } catch (e) {
      console.error('Failed to load my reservations', e)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchAd()
      setLoading(false)
    }
    loadData()
  }, [id])

  useEffect(() => {
    if (ad) {
      if (isOwner) {
        fetchBookings()
      } else if (user) {
        fetchMyBooking()
      }
    }
  }, [ad, user, isOwner])

  const handleDelete = async () => {
    if (!window.confirm('Delete this trip?')) return
    try {
      await carpoolAPI.delete(id)
      toast.success('Deleted')
      navigate('/carpool')
    } catch (error) {
      toast.error('Failed')
    }
  }

  const handleMarkCompleted = async () => {
    try {
      await carpoolAPI.markCompleted(id)
      toast.success(t('carpool.markCompleted'))
      await fetchAd()
    } catch (error) {
      toast.error('Failed')
    }
  }

  const handleRequestBooking = async () => {
    try {
      const res = await carpoolAPI.createBooking(id, { seats_requested: seatsToBook })
      toast.success(t('carpool.bookingSuccess'))
      setMyBooking(res.data)
      await fetchAd()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la réservation')
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Annuler cette réservation ?')) return
    try {
      await carpoolAPI.cancelBooking(bookingId)
      toast.success(t('carpool.bookingCancelled'))
      setMyBooking(null)
      await fetchAd()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'annulation')
    }
  }

  const handleAcceptBooking = async (bookingId) => {
    try {
      await carpoolAPI.acceptBooking(bookingId)
      toast.success('Réservation acceptée !')
      await fetchAd()
      await fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    }
  }

  const handleRejectBooking = async (bookingId) => {
    try {
      await carpoolAPI.rejectBooking(bookingId)
      toast.success('Réservation refusée')
      await fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!ad) return <div className="empty-state"><h3>Not found</h3></div>

  return (
    <div className="page-container">
      <div className="container">
        <Link to="/carpool" className="text-sm mb-3 inline-block">&larr; {t('common.back')}</Link>
        <div className="grid grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div>
            <div className="card">
              <div className="card-body">
                <h1 className="text-2xl font-bold mb-2">{ad.departure_city} &rarr; {ad.destination_city}</h1>
                <span className={`badge badge-${ad.status === 'active' ? 'success' : ad.status === 'completed' ? 'info' : 'danger'}`}>
                  {t(`carpool.${ad.status}`)}
                </span>
                {ad.additional_info && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">{t('carpool.additionalInfo')}</h3>
                    <p>{ad.additional_info}</p>
                  </div>
                )}
              </div>
            </div>

            {/* List Booking Requests for Driver */}
            {isOwner && (
              <div className="card mt-4">
                <div className="card-body">
                  <h3 className="text-xl font-bold mb-3">{t('carpool.bookingRequests')}</h3>
                  {bookings.length === 0 ? (
                    <p className="text-gray">{t('carpool.noRequests')}</p>
                  ) : (
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid var(--color-gray-200)' }}>
                            <th style={{ padding: '8px' }}>{t('profile.fullName')}</th>
                            <th style={{ padding: '8px' }}>{t('carpool.seatsToBook')}</th>
                            <th style={{ padding: '8px' }}>{t('common.status')}</th>
                            <th style={{ padding: '8px' }}>{t('common.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map(b => (
                            <tr key={b.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                              <td style={{ padding: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {b.passenger_profile_picture ? (
                                    <img src={b.passenger_profile_picture} alt={b.passenger_username} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                  ) : (
                                    <div className="avatar-placeholder rounded-circle" style={{ width: 32, height: 32, fontSize: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--color-gray-200)', borderRadius: '50%' }}>
                                      <FaUser size={12} color="var(--color-gray-500)" />
                                    </div>
                                  )}
                                  <Link to={`/users/${b.passenger_username}`}>
                                    {b.passenger_full_name || b.passenger_username}
                                  </Link>
                                </div>
                              </td>
                              <td style={{ padding: '8px' }}>{b.seats_requested}</td>
                              <td style={{ padding: '8px' }}>
                                <span className={`badge badge-${b.status === 'accepted' ? 'success' : b.status === 'pending' ? 'warning' : 'danger'}`}>
                                  {t(`carpool.${b.status}`)}
                                </span>
                              </td>
                              <td style={{ padding: '8px' }}>
                                {b.status === 'pending' && (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => handleAcceptBooking(b.id)}
                                      className="btn btn-primary btn-sm"
                                      style={{ padding: '4px 8px', fontSize: '12px' }}
                                    >
                                      Accepter
                                    </button>
                                    <button
                                      onClick={() => handleRejectBooking(b.id)}
                                      className="btn btn-outline btn-sm text-danger"
                                      style={{ padding: '4px 8px', fontSize: '12px', borderColor: 'var(--color-danger)' }}
                                    >
                                      Refuser
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4"><Comments contentType="carpool" contentId={ad.id} /></div>
          </div>
          <div>
            <div className="card sticky-sidebar">
              <div className="card-body">
                <div className="price-box">
                  <span className="price-large">{ad.price_per_passenger} MAD</span>
                  <span className="text-gray">/ {t('carpool.pricePerPassenger')}</span>
                </div>
                <div className="detail-stats mt-4">
                  <div className="stat-item"><FaCalendarAlt /> <span>{new Date(ad.departure_date).toLocaleDateString()}</span></div>
                  <div className="stat-item"><FaClock /> <span>{ad.departure_time}</span></div>
                  <div className="stat-item"><FaChair /> <span>{ad.available_seats} {t('carpool.availableSeats')}</span></div>
                  {ad.vehicle_model && <div className="stat-item"><FaCar /> <span>{ad.vehicle_model} {ad.vehicle_color}</span></div>}
                  {ad.meeting_point && <div className="stat-item"><FaMapMarkerAlt /> <span>{ad.meeting_point}</span></div>}
                </div>
                {ad.phone_number && (
                  <a href={`tel:${ad.phone_number}`} className="btn btn-primary btn-block mt-4"><FaPhone /> {ad.phone_number}</a>
                )}

                {/* Seat Booking Panel for Passengers */}
                {!isOwner && (
                  <div>
                    {!user ? (
                      <Link to="/login" className="btn btn-outline btn-block mt-4">
                        {t('carpool.loginToBook')}
                      </Link>
                    ) : myBooking ? (
                      <div className="card mt-4" style={{ backgroundColor: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
                        <div className="card-body" style={{ padding: '16px' }}>
                          <h4 className="font-semibold mb-2" style={{ fontSize: '15px' }}>{t('carpool.myReservations')}</h4>
                          <div className="mb-2 text-sm">
                            <strong>{t('common.status')}: </strong>
                            <span className={`badge badge-${myBooking.status === 'accepted' ? 'success' : 'warning'}`}>
                              {t(`carpool.${myBooking.status}`)}
                            </span>
                          </div>
                          <div className="mb-3 text-sm">
                            <strong>{t('carpool.seatsToBook')}: </strong> {myBooking.seats_requested}
                          </div>
                          {myBooking.status === 'pending' || myBooking.status === 'accepted' ? (
                            <button
                              onClick={() => handleCancelBooking(myBooking.id)}
                              className="btn btn-danger btn-block btn-sm"
                            >
                              {t('carpool.cancelBooking')}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : ad.available_seats > 0 && ad.status === 'active' ? (
                      <div className="booking-form mt-4 border-t pt-4" style={{ borderTop: '1px solid var(--color-gray-200)', marginTop: '20px', paddingTop: '20px' }}>
                        <h4 className="font-semibold mb-3" style={{ fontSize: '16px' }}>{t('carpool.bookSeat')}</h4>
                        <div className="form-group mb-3">
                          <label className="form-label text-sm" style={{ display: 'block', marginBottom: '8px' }}>{t('carpool.seatsToBook')}</label>
                          <select
                            value={seatsToBook}
                            onChange={(e) => setSeatsToBook(parseInt(e.target.value))}
                            className="form-control"
                            style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)' }}
                          >
                            {[...Array(Math.min(ad.available_seats, 8))].map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={handleRequestBooking}
                          className="btn btn-primary btn-block"
                        >
                          {t('carpool.requestBooking')}
                        </button>
                      </div>
                    ) : ad.status !== 'active' ? (
                      <div className="mt-4 text-center text-gray font-semibold text-sm">
                        Trajet terminé ou annulé
                      </div>
                    ) : (
                      <div className="mt-4 text-center text-danger font-semibold text-sm">
                        {t('carpool.noSeatsLeft')}
                      </div>
                    )}
                  </div>
                )}

                {isOwner && (
                  <div className="owner-actions mt-4">
                    <Link to={`/carpool/${ad.id}/edit`} className="btn btn-outline btn-block mb-2"><FaEdit /> {t('common.edit')}</Link>
                    {ad.status !== 'completed' && <button onClick={handleMarkCompleted} className="btn btn-accent btn-block mb-2"><FaCheck /> {t('carpool.markCompleted')}</button>}
                    <button onClick={handleDelete} className="btn btn-danger btn-block"><FaTrash /> {t('common.delete')}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}