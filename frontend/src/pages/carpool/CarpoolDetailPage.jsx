import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { carpoolAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaCalendarAlt, FaClock, FaChair, FaCar, FaPhone, FaEdit, FaTrash, FaCheck, FaMapMarkerAlt } from 'react-icons/fa'
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

  useEffect(() => {
    const fetchAd = async () => {
      try { const response = await carpoolAPI.get(id); setAd(response.data) }
      catch (error) { toast.error('Failed to load') }
      setLoading(false)
    }
    fetchAd()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('Delete this trip?')) return
    try { await carpoolAPI.delete(id); toast.success('Deleted'); navigate('/carpool') }
    catch (error) { toast.error('Failed') }
  }

  const handleMarkCompleted = async () => {
    try { await carpoolAPI.markCompleted(id); toast.success(t('carpool.markCompleted')); const r = await carpoolAPI.get(id); setAd(r.data) }
    catch (error) { toast.error('Failed') }
  }

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!ad) return <div className="empty-state"><h3>Not found</h3></div>

  const isOwner = user && (user.id === ad.user_id || user.is_admin)

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