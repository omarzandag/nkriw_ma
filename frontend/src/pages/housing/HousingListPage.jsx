import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { housingAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaPlus, FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined } from 'react-icons/fa'
import Pagination from '../../components/Pagination'
import './Housing.css'

export default function HousingListPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    city: '',
    rental_type: '',
    min_price: '',
    max_price: '',
    keyword: '',
  })

  const fetchAds = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 12 }
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params[key] = filters[key]
      })
      const response = await housingAPI.list(params)
      setAds(response.data.items)
      setTotalPages(response.data.pages)
    } catch (error) {
      console.error('Failed to fetch housing ads:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAds()
  }, [page])

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchAds()
  }

  const rentalTypes = ['apartment', 'house', 'studio', 'villa', 'shared_room', 'private_room', 'student_residence']

  return (
    <div className="page-container">
      <div className="container">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{t('housing.title')}</h1>
          {isAuthenticated && (
            <Link to="/housing/create" className="btn btn-primary">
              <FaPlus /> {t('housing.createAd')}
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="card mb-4">
          <div className="card-body">
            <form onSubmit={handleFilterSubmit} className="filter-form">
              <div className="form-group">
                <label className="form-label">{t('common.search')}</label>
                <input type="text" name="keyword" className="form-input" value={filters.keyword} onChange={handleFilterChange} placeholder={t('common.search')} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('common.city')}</label>
                <input type="text" name="city" className="form-input" value={filters.city} onChange={handleFilterChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('housing.rentalType')}</label>
                <select name="rental_type" className="form-select" value={filters.rental_type} onChange={handleFilterChange}>
                  <option value="">{t('common.all')}</option>
                  {rentalTypes.map((type) => (
                    <option key={type} value={type}>{t(`housing.${type}`)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('common.price')} Min</label>
                <input type="number" name="min_price" className="form-input" value={filters.min_price} onChange={handleFilterChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('common.price')} Max</label>
                <input type="number" name="max_price" className="form-input" value={filters.max_price} onChange={handleFilterChange} />
              </div>
              <button type="submit" className="btn btn-primary">{t('common.filter')}</button>
            </form>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : ads.length === 0 ? (
          <div className="empty-state">
            <h3>{t('common.noResults')}</h3>
          </div>
        ) : (
          <div className="grid grid-3">
            {ads.map((ad) => (
              <Link to={`/housing/${ad.id}`} key={ad.id} className="card housing-card">
                <div className="housing-card-image">
                  {ad.images && ad.images.length > 0 ? (
                    <img src={ad.images[0].image_url} alt={ad.title} />
                  ) : (
                    <div className="no-image"><FaMapMarkerAlt /></div>
                  )}
                  <span className={`badge badge-${ad.status === 'available' ? 'success' : ad.status === 'reserved' ? 'warning' : 'danger'}`}>
                    {t(`housing.${ad.status}`)}
                  </span>
                </div>
                <div className="card-body">
                  <h3 className="housing-card-title">{ad.title}</h3>
                  <p className="housing-card-location"><FaMapMarkerAlt /> {ad.city}{ad.neighborhood ? `, ${ad.neighborhood}` : ''}</p>
                  <div className="housing-card-details">
                    <span><FaBed /> {ad.rooms}</span>
                    <span><FaBath /> {ad.bathrooms}</span>
                    {ad.surface_area && <span><FaRulerCombined /> {ad.surface_area}m²</span>}
                  </div>
                  <div className="housing-card-price">
                    <span className="price">{ad.monthly_price} MAD</span>
                    <span className="text-sm text-gray">/ {t('common.page')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}