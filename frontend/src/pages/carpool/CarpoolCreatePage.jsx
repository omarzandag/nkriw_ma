import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { carpoolAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function CarpoolCreatePage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    departure_city: '', destination_city: '', departure_date: '', departure_time: '',
    available_seats: 1, price_per_passenger: '', vehicle_model: '', vehicle_color: '',
    driver_name: '', phone_number: '', meeting_point: '', estimated_arrival: '', additional_info: '',
  })

  useEffect(() => {
    if (isEdit) {
      const fetchAd = async () => {
        try {
          const response = await carpoolAPI.get(id)
          const ad = response.data
          setFormData({
            departure_city: ad.departure_city || '', destination_city: ad.destination_city || '',
            departure_date: ad.departure_date || '', departure_time: ad.departure_time || '',
            available_seats: ad.available_seats || 1, price_per_passenger: ad.price_per_passenger || '',
            vehicle_model: ad.vehicle_model || '', vehicle_color: ad.vehicle_color || '',
            driver_name: ad.driver_name || '', phone_number: ad.phone_number || '',
            meeting_point: ad.meeting_point || '', estimated_arrival: ad.estimated_arrival || '',
            additional_info: ad.additional_info || '',
          })
        } catch (error) { toast.error('Failed to load') }
      }
      fetchAd()
    }
  }, [id, isEdit])

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit) { await carpoolAPI.update(id, formData); toast.success('Updated') }
      else { await carpoolAPI.create(formData); toast.success('Created') }
      navigate('/carpool')
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed') }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-form-container">
          <h1 className="text-2xl font-bold mb-4">{isEdit ? t('common.edit') : t('carpool.createAd')}</h1>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('carpool.departureCity')}</label>
                <input type="text" name="departure_city" className="form-input" value={formData.departure_city} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('carpool.destinationCity')}</label>
                <input type="text" name="destination_city" className="form-input" value={formData.destination_city} onChange={handleChange} required />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('carpool.departureDate')}</label>
                <input type="date" name="departure_date" className="form-input" value={formData.departure_date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('carpool.departureTime')}</label>
                <input type="time" name="departure_time" className="form-input" value={formData.departure_time} onChange={handleChange} required />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('carpool.availableSeats')}</label>
                <input type="number" name="available_seats" className="form-input" value={formData.available_seats} onChange={handleChange} min="1" max="8" required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('carpool.pricePerPassenger')} (MAD)</label>
                <input type="number" name="price_per_passenger" className="form-input" value={formData.price_per_passenger} onChange={handleChange} min="0" required />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('carpool.vehicleModel')}</label>
                <input type="text" name="vehicle_model" className="form-input" value={formData.vehicle_model} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('carpool.vehicleColor')}</label>
                <input type="text" name="vehicle_color" className="form-input" value={formData.vehicle_color} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('carpool.driverName')}</label>
                <input type="text" name="driver_name" className="form-input" value={formData.driver_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('carpool.phoneNumber')}</label>
                <input type="tel" name="phone_number" className="form-input" value={formData.phone_number} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('carpool.meetingPoint')}</label>
              <input type="text" name="meeting_point" className="form-input" value={formData.meeting_point} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('carpool.estimatedArrival')}</label>
              <input type="text" name="estimated_arrival" className="form-input" value={formData.estimated_arrival} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('carpool.additionalInfo')}</label>
              <textarea name="additional_info" className="form-textarea" value={formData.additional_info} onChange={handleChange} />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="spinner"></span> : t('common.save')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}