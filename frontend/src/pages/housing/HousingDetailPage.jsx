import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { housingAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined, FaPhone, FaEdit, FaTrash, FaCheck } from 'react-icons/fa'
import toast from 'react-hot-toast'
import Comments from '../../components/Comments'
import './Housing.css'

export default function HousingDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ad, setAd] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const response = await housingAPI.get(id)
        setAd(response.data)
      } catch (error) {
        toast.error('Failed to load advertisement')
      }
      setLoading(false)
    }
    fetchAd()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) return
    try {
      await housingAPI.delete(id)
      toast.success('Advertisement deleted')
      navigate('/housing')
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const handleMarkRented = async () => {
    try {
      await housingAPI.markRented(id)
      toast.success(t('housing.markRented'))
      const response = await housingAPI.get(id)
      setAd(response.data)
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!ad) return <div className="empty-state"><h3>Advertisement not found</h3></div>

  const isOwner = user && (user.id === ad.user_id || user.is_admin)

  const amenities = [
    { key: 'internet', label: t('housing.internet') },
    { key: 'parking', label: t('housing.parking') },
    { key: 'balcony', label: t('housing.balcony') },
    { key: 'kitchen', label: t('housing.kitchen') },
    { key: 'washing_machine', label: t('housing.washingMachine') },
    { key: 'air_conditioning', label: t('housing.airConditioning') },
    { key: 'heating', label: t('housing.heating') },
    { key: 'furnished', label: t('housing.furnished') },
    { key: 'bills_included', label: t('housing.billsIncluded') },
    { key: 'smoking_allowed', label: t('housing.smokingAllowed') },
    { key: 'pets_allowed', label: t('housing.petsAllowed') },
  ]

  return (
    <div className="page-container">
      <div className="container">
        <Link to="/housing" className="text-sm mb-3 inline-block">&larr; {t('common.back')}</Link>

        <div className="grid grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div>
            {/* Images */}
            <div className="housing-detail-images">
              {ad.images && ad.images.length > 0 ? (
                <img src={ad.images[0].image_url} alt={ad.title} className="main-image" />
              ) : (
                <div className="no-image large"><FaMapMarkerAlt /></div>
              )}
            </div>

            <div className="card mt-4">
              <div className="card-body">
                <div className="flex items-center gap-sm mb-2">
                  {ad.author_profile_picture ? (
                    <Link to={`/users/${ad.author_username}`}>
                      <img src={ad.author_profile_picture} alt={ad.author_username} className="reply-avatar" />
                    </Link>
                  ) : (
                    <Link to={`/users/${ad.author_username}`}>
                      <div className="reply-avatar-placeholder">{ad.author_username?.charAt(0)?.toUpperCase()}</div>
                    </Link>
                  )}
                  <Link to={`/users/${ad.author_username}`} className="font-semibold text-sm">
                    {ad.author_username || 'User'}
                  </Link>
                </div>
                <h1 className="text-2xl font-bold mb-2">{ad.title}</h1>
                <p className="text-gray mb-3"><FaMapMarkerAlt /> {ad.city}{ad.neighborhood ? `, ${ad.neighborhood}` : ''}{ad.address ? ` - ${ad.address}` : ''}</p>
                <span className={`badge badge-${ad.status === 'available' ? 'success' : ad.status === 'reserved' ? 'warning' : 'danger'}`}>
                  {t(`housing.${ad.status}`)}
                </span>
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">{t('housing.description')}</h3>
                  <p>{ad.description}</p>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="card mt-4">
              <div className="card-body">
                <h3 className="font-semibold mb-3">Features & Amenities</h3>
                <div className="amenities-grid">
                  {amenities.map((amenity) => (
                    <div key={amenity.key} className={`amenity-item ${ad[amenity.key] ? 'active' : ''}`}>
                      <FaCheck /> {amenity.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="mt-4">
              <Comments contentType="housing" contentId={ad.id} />
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="card sticky-sidebar">
              <div className="card-body">
                <div className="price-box">
                  <span className="price-large">{ad.monthly_price} MAD</span>
                  <span className="text-gray">/ {t('common.page')}</span>
                </div>
                {ad.deposit > 0 && (
                  <p className="text-sm text-gray mt-2">{t('housing.deposit')}: {ad.deposit} MAD</p>
                )}

                <div className="detail-stats mt-4">
                  <div className="stat-item"><FaBed /> <span>{ad.rooms} {t('housing.rooms')}</span></div>
                  <div className="stat-item"><FaBath /> <span>{ad.bathrooms} {t('housing.bathrooms')}</span></div>
                  {ad.surface_area && <div className="stat-item"><FaRulerCombined /> <span>{ad.surface_area} m²</span></div>}
                </div>

                {ad.available_date && (
                  <p className="mt-3 text-sm"><strong>{t('housing.availableDate')}:</strong> {new Date(ad.available_date).toLocaleDateString()}</p>
                )}

                {ad.contact_phone && (
                  <a href={`tel:${ad.contact_phone}`} className="btn btn-primary btn-block mt-4">
                    <FaPhone /> {ad.contact_phone}
                  </a>
                )}

                {isOwner && (
                  <div className="owner-actions mt-4">
                    <Link to={`/housing/${ad.id}/edit`} className="btn btn-outline btn-block mb-2">
                      <FaEdit /> {t('common.edit')}
                    </Link>
                    {ad.status !== 'rented' && (
                      <button onClick={handleMarkRented} className="btn btn-accent btn-block mb-2">
                        <FaCheck /> {t('housing.markRented')}
                      </button>
                    )}
                    <button onClick={handleDelete} className="btn btn-danger btn-block">
                      <FaTrash /> {t('common.delete')}
                    </button>
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