import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { carpoolAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { FaPlus, FaMapMarkerAlt, FaChair, FaCalendarAlt, FaClock } from 'react-icons/fa'
import Pagination from '../../components/Pagination'
import '../housing/Housing.css'

export default function CarpoolListPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({ departure_city: '', destination_city: '', keyword: '' })

  const fetchAds = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 12 }
      Object.keys(filters).forEach((key) => { if (filters[key]) params[key] = filters[key] })
      const response = await carpoolAPI.list(params)
      setAds(response.data.items)
      setTotalPages(response.data.pages)
    } catch (error) { console.error('Failed:', error) }
    setLoading(false)
  }

  useEffect(() => { fetchAds() }, [page])

  const handleFilterChange = (e) => setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  const handleFilterSubmit = (e) => { e.preventDefault(); setPage(1); fetchAds() }

  return (
    <div className="page-container">
      <div className="container">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{t('carpool.title')}</h1>
          {isAuthenticated && (
            <Link to="/carpool/create" className="btn btn-primary"><FaPlus /> {t('carpool.createAd')}</Link>
          )}
        </div>

        <div className="card mb-4">
          <div className="card-body">
            <form onSubmit={handleFilterSubmit} className="filter-form">
              <div className="form-group">
                <label className="form-label">{t('carpool.departureCity')}</label>
                <input type="text" name="departure_city" className="form-input" value={filters.departure_city} onChange={handleFilterChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('carpool.destinationCity')}</label>
                <input type="text" name="destination_city" className="form-input" value={filters.destination_city} onChange={handleFilterChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('common.search')}</label>
                <input type="text" name="keyword" className="form-input" value={filters.keyword} onChange={handleFilterChange} />
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
              <Link to={`/carpool/${ad.id}`} key={ad.id} className="card housing-card">
                <div className="card-body">
                  <span className={`badge badge-${ad.status === 'active' ? 'success' : ad.status === 'completed' ? 'info' : 'danger'}`}>
                    {t(`carpool.${ad.status}`)}
                  </span>
                  <h3 className="housing-card-title mt-2">{ad.departure_city} &rarr; {ad.destination_city}</h3>
                  <div className="housing-card-details">
                    <span><FaCalendarAlt /> {new Date(ad.departure_date).toLocaleDateString()}</span>
                    <span><FaClock /> {ad.departure_time}</span>
                  </div>
                  <div className="housing-card-details">
                    <span><FaChair /> {ad.available_seats} {t('carpool.availableSeats')}</span>
                  </div>
                  <div className="housing-card-price">
                    <span className="price">{ad.price_per_passenger} MAD</span>
                    <span className="text-sm text-gray">/ {t('carpool.pricePerPassenger')}</span>
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