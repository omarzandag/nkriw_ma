import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { colocationAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaMapMarkerAlt, FaBed, FaUsers, FaPhone, FaEdit, FaTrash, FaCheck, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import toast from 'react-hot-toast'
import Comments from '../../components/Comments'
import '../housing/Housing.css'

export default function ColocationDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ad, setAd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const response = await colocationAPI.get(id)
        setAd(response.data)
      } catch (error) {
        toast.error('Failed to load')
      }
      setLoading(false)
    }
    fetchAd()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('Delete this advertisement?')) return
    try {
      await colocationAPI.delete(id)
      toast.success('Deleted')
      navigate('/colocation')
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const handleMarkFound = async () => {
    try {
      await colocationAPI.markFound(id)
      toast.success(t('colocation.markFound'))
      const response = await colocationAPI.get(id)
      setAd(response.data)
    } catch (error) {
      toast.error('Failed')
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>
  if (!ad) return <div className="empty-state"><h3>Not found</h3></div>

  const isOwner = user && (user.id === ad.user_id || user.is_admin)

  return (
    <div className="page-container">
      <div className="container">
        <Link to="/colocation" className="text-sm mb-3 inline-block">&larr; {t('common.back')}</Link>
        <div className="grid grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div>
            <div className="housing-detail-images">
              {ad.images && ad.images.length > 0 ? (
                <>
                  <div className="image-gallery">
                    <img src={ad.images[currentImageIndex].image_url} alt={`${ad.title} - ${currentImageIndex + 1}`} className="main-image" />
                    {ad.images.length > 1 && (
                      <>
                        <button 
                          className="gallery-nav gallery-prev" 
                          onClick={() => setCurrentImageIndex(prev => prev === 0 ? ad.images.length - 1 : prev - 1)}
                          aria-label="Previous image"
                        >
                          <FaChevronLeft />
                        </button>
                        <button 
                          className="gallery-nav gallery-next" 
                          onClick={() => setCurrentImageIndex(prev => prev === ad.images.length - 1 ? 0 : prev + 1)}
                          aria-label="Next image"
                        >
                          <FaChevronRight />
                        </button>
                        <div className="gallery-counter">
                          {currentImageIndex + 1} / {ad.images.length}
                        </div>
                      </>
                    )}
                  </div>
                  {ad.images.length > 1 && (
                    <div className="image-thumbnails">
                      {ad.images.map((img, index) => (
                        <img 
                          key={img.id} 
                          src={img.image_url} 
                          alt={`Thumbnail ${index + 1}`} 
                          className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                          onClick={() => setCurrentImageIndex(index)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="no-image large"><FaUsers /></div>
              )}
            </div>
            <div className="card mt-4">
              <div className="card-body">
                <h1 className="text-2xl font-bold mb-2">{ad.title}</h1>
                <p className="text-gray mb-3"><FaMapMarkerAlt /> {ad.city}{ad.neighborhood ? `, ${ad.neighborhood}` : ''}</p>
                <span className={`badge badge-${ad.status === 'available' ? 'success' : 'info'}`}>
                  {ad.status === 'found' ? t('colocation.found') : t('housing.available')}
                </span>
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">{t('housing.description')}</h3>
                  <p>{ad.description}</p>
                </div>
              </div>
            </div>
            <div className="mt-4"><Comments contentType="colocation" contentId={ad.id} /></div>
          </div>
          <div>
            <div className="card sticky-sidebar">
              <div className="card-body">
                <div className="price-box">
                  <span className="price-large">{ad.monthly_rent} MAD</span>
                  <span className="text-gray">/ {t('common.page')}</span>
                </div>
                <div className="detail-stats mt-4">
                  <div className="stat-item"><FaBed /> <span>{ad.available_rooms} {t('colocation.availableRooms')}</span></div>
                  <div className="stat-item"><FaUsers /> <span>{ad.current_roommates} {t('colocation.currentRoommates')}</span></div>
                </div>
                {ad.preferred_gender && <p className="mt-3 text-sm"><strong>{t('colocation.preferredGender')}:</strong> {t(`profile.${ad.preferred_gender}`)}</p>}
                {ad.student_only && <p className="mt-2 text-sm"><span className="badge badge-info">{t('colocation.studentOnly')}</span></p>}
                {ad.working_professional_only && <p className="mt-2 text-sm"><span className="badge badge-info">{t('colocation.workingProfessionalOnly')}</span></p>}
                {ad.contact_phone && (
                  <a href={`tel:${ad.contact_phone}`} className="btn btn-primary btn-block mt-4"><FaPhone /> {ad.contact_phone}</a>
                )}
                {isOwner && (
                  <div className="owner-actions mt-4">
                    <Link to={`/colocation/${ad.id}/edit`} className="btn btn-outline btn-block mb-2"><FaEdit /> {t('common.edit')}</Link>
                    {ad.status !== 'found' && <button onClick={handleMarkFound} className="btn btn-accent btn-block mb-2"><FaCheck /> {t('colocation.markFound')}</button>}
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