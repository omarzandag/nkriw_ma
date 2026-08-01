import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { colocationAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaPlus, FaMapMarkerAlt, FaUsers, FaBed } from 'react-icons/fa'
import Pagination from '../../components/Pagination'
import '../housing/Housing.css'

export default function ColocationListPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({ city: '', preferred_gender: '', keyword: '' })

  const fetchAds = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 12 }
      Object.keys(filters).forEach((key) => { if (filters[key]) params[key] = filters[key] })
      const response = await colocationAPI.list(params)
      setAds(response.data.items)
      setTotalPages(response.data.pages)
    } catch (error) {
      console.error('Failed to fetch:', error)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAds() }, [page])

  const handleFilterChange = (e) => setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  const handleFilterSubmit = (e) => { e.preventDefault(); setPage(1); fetchAds() }

  return (
    <div className="page-container">
      <div className="container">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{t('colocation.title')}</h1>
          {isAuthenticated && (
            <Link to="/colocation/create" className="btn btn-primary"><FaPlus /> {t('colocation.createAd')}</Link>
          )}
        </div>

        <div className="card mb-4">
          <div className="card-body">
            <form onSubmit={handleFilterSubmit} className="filter-form">
              <div className="form-group">
                <label className="form-label">{t('common.search')}</label>
                <input type="text" name="keyword" className="form-input" value={filters.keyword} onChange={handleFilterChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('common.city')}</label>
                <input type="text" name="city" className="form-input" value={filters.city} onChange={handleFilterChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('colocation.preferredGender')}</label>
                <select name="preferred_gender" className="form-select" value={filters.preferred_gender} onChange={handleFilterChange}>
                  <option value="">{t('common.all')}</option>
                  <option value="male">{t('profile.male')}</option>
                  <option value="female">{t('profile.female')}</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">{t('common.filter')}</button>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : ads.length === 0 ? (
          <div className="empty-state"><h3>{t('common.noResults')}</h3></div>
        ) : (
          <div className="grid grid-3">
            {ads.map((ad) => (
              <Link to={`/colocation/${ad.id}`} key={ad.id} className="card housing-card">
                <div className="housing-card-image">
                  {ad.images && ad.images.length > 0 ? (
                    <img src={ad.images[0].image_url} alt={ad.title} />
                  ) : (
                    <div className="no-image"><FaUsers /></div>
                  )}
                  <span className={`badge badge-${ad.status === 'available' ? 'success' : 'info'}`}>
                    {ad.status === 'found' ? t('colocation.found') : t('housing.available')}
                  </span>
                </div>
                <div className="card-body">
                  <h3 className="housing-card-title">{ad.title}</h3>
                  <p className="housing-card-location"><FaMapMarkerAlt /> {ad.city}{ad.neighborhood ? `, ${ad.neighborhood}` : ''}</p>
                  <div className="housing-card-details">
                    <span><FaBed /> {ad.available_rooms} {t('colocation.availableRooms')}</span>
                    <span><FaUsers /> {ad.current_roommates} {t('colocation.currentRoommates')}</span>
                  </div>
                  <div className="housing-card-price">
                    <span className="price">{ad.monthly_rent} MAD</span>
                    <span className="text-sm text-gray">/ {t('common.page')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>
    </div>
  )
}