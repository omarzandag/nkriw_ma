import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { housingAPI } from '../../services/api'
import { FaUpload, FaTimes, FaImage } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function HousingCreatePage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [formData, setFormData] = useState({
    title: '', description: '', rental_type: 'apartment', monthly_price: '',
    deposit: '', bills_included: false, furnished: false, rooms: 1, bathrooms: 1,
    surface_area: '', available_date: '', city: '', neighborhood: '', address: '',
    contact_phone: '', preferred_contact: 'phone', gender_preference: '',
    smoking_allowed: false, pets_allowed: false, internet: false, parking: false,
    balcony: false, kitchen: false, washing_machine: false, air_conditioning: false, heating: false,
  })

  useEffect(() => {
    if (isEdit) {
      const fetchAd = async () => {
        try {
          const response = await housingAPI.get(id)
          const ad = response.data
          setFormData({
            title: ad.title || '', description: ad.description || '', rental_type: ad.rental_type || 'apartment',
            monthly_price: ad.monthly_price || '', deposit: ad.deposit || '', bills_included: ad.bills_included || false,
            furnished: ad.furnished || false, rooms: ad.rooms || 1, bathrooms: ad.bathrooms || 1,
            surface_area: ad.surface_area || '', available_date: ad.available_date || '', city: ad.city || '',
            neighborhood: ad.neighborhood || '', address: ad.address || '', contact_phone: ad.contact_phone || '',
            preferred_contact: ad.preferred_contact || 'phone', gender_preference: ad.gender_preference || '',
            smoking_allowed: ad.smoking_allowed || false, pets_allowed: ad.pets_allowed || false,
            internet: ad.internet || false, parking: ad.parking || false, balcony: ad.balcony || false,
            kitchen: ad.kitchen || false, washing_machine: ad.washing_machine || false,
            air_conditioning: ad.air_conditioning || false, heating: ad.heating || false,
          })
        } catch (error) {
          toast.error('Failed to load advertisement')
        }
      }
      fetchAd()
    }
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    setImageFiles(files)
    const previews = files.map(file => URL.createObjectURL(file))
    setImagePreviews(previews)
  }

  const removeImage = (index) => {
    const newFiles = [...imageFiles]
    const newPreviews = [...imagePreviews]
    URL.revokeObjectURL(newPreviews[index])
    newFiles.splice(index, 1)
    newPreviews.splice(index, 1)
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = { ...formData }
      if (data.available_date === '') delete data.available_date
      let adId = id
      if (isEdit) {
        await housingAPI.update(id, data)
        toast.success('Advertisement updated successfully')
      } else {
        const response = await housingAPI.create(data)
        adId = response.data.id
        toast.success('Advertisement created successfully')
      }
      // Upload images if any
      if (imageFiles.length > 0) {
        try {
          await housingAPI.uploadImages(adId, imageFiles)
          toast.success('Images uploaded successfully')
        } catch (error) {
          toast.error('Failed to upload images')
        }
      }
      navigate('/housing')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save')
    }
    setLoading(false)
  }

  const rentalTypes = ['apartment', 'house', 'studio', 'villa', 'shared_room', 'private_room', 'student_residence']
  const checkboxes = [
    { key: 'bills_included', label: t('housing.billsIncluded') },
    { key: 'furnished', label: t('housing.furnished') },
    { key: 'smoking_allowed', label: t('housing.smokingAllowed') },
    { key: 'pets_allowed', label: t('housing.petsAllowed') },
    { key: 'internet', label: t('housing.internet') },
    { key: 'parking', label: t('housing.parking') },
    { key: 'balcony', label: t('housing.balcony') },
    { key: 'kitchen', label: t('housing.kitchen') },
    { key: 'washing_machine', label: t('housing.washingMachine') },
    { key: 'air_conditioning', label: t('housing.airConditioning') },
    { key: 'heating', label: t('housing.heating') },
  ]

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-form-container">
          <h1 className="text-2xl font-bold mb-4">{isEdit ? t('common.edit') : t('housing.createAd')}</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('housing.adTitle')}</label>
              <input type="text" name="title" className="form-input" value={formData.title} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('housing.description')}</label>
              <textarea name="description" className="form-textarea" value={formData.description} onChange={handleChange} required />
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('housing.rentalType')}</label>
                <select name="rental_type" className="form-select" value={formData.rental_type} onChange={handleChange}>
                  {rentalTypes.map((type) => <option key={type} value={type}>{t(`housing.${type}`)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('housing.monthlyPrice')} (MAD)</label>
                <input type="number" name="monthly_price" className="form-input" value={formData.monthly_price} onChange={handleChange} required min="0" />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('housing.deposit')} (MAD)</label>
                <input type="number" name="deposit" className="form-input" value={formData.deposit} onChange={handleChange} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('housing.surfaceArea')} (m²)</label>
                <input type="number" name="surface_area" className="form-input" value={formData.surface_area} onChange={handleChange} min="0" />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('housing.rooms')}</label>
                <input type="number" name="rooms" className="form-input" value={formData.rooms} onChange={handleChange} min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('housing.bathrooms')}</label>
                <input type="number" name="bathrooms" className="form-input" value={formData.bathrooms} onChange={handleChange} min="1" />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('common.city')}</label>
                <input type="text" name="city" className="form-input" value={formData.city} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('housing.neighborhood')}</label>
                <input type="text" name="neighborhood" className="form-input" value={formData.neighborhood} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('housing.availableDate')}</label>
                <input type="date" name="available_date" className="form-input" value={formData.available_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('housing.contactPhone')}</label>
                <input type="tel" name="contact_phone" className="form-input" value={formData.contact_phone} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('housing.genderPreference')}</label>
              <select name="gender_preference" className="form-select" value={formData.gender_preference} onChange={handleChange}>
                <option value="">{t('common.all')}</option>
                <option value="male">{t('profile.male')}</option>
                <option value="female">{t('profile.female')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Features & Amenities</label>
              <div className="checkbox-grid">
                {checkboxes.map((cb) => (
                  <label key={cb.key} className="form-check">
                    <input type="checkbox" name={cb.key} checked={formData[cb.key]} onChange={handleChange} />
                    <span className="text-sm">{cb.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('housing.images')}</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                  <FaUpload className="text-2xl text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">{t('housing.uploadImages')}</span>
                </label>
              </div>
              {imagePreviews.length > 0 && (
                <div className="image-preview-container">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="image-preview">
                      <img src={preview} alt={`preview-${index}`} />
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeImage(index)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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