import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { colocationAPI } from '../../services/api'
import { FaUpload, FaTimes } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function ColocationCreatePage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [formData, setFormData] = useState({
    title: '', description: '', monthly_rent: '', available_rooms: 1, current_roommates: 0,
    city: '', neighborhood: '', address: '', preferred_gender: '', min_age: '', max_age: '',
    student_only: false, working_professional_only: false, smoking_allowed: false, pets_allowed: false,
    contact_phone: '', available_date: '',
  })

  useEffect(() => {
    if (isEdit) {
      const fetchAd = async () => {
        try {
          const response = await colocationAPI.get(id)
          const ad = response.data
          setFormData({
            title: ad.title || '', description: ad.description || '', monthly_rent: ad.monthly_rent || '',
            available_rooms: ad.available_rooms || 1, current_roommates: ad.current_roommates || 0,
            city: ad.city || '', neighborhood: ad.neighborhood || '', address: ad.address || '',
            preferred_gender: ad.preferred_gender || '', min_age: ad.min_age || '', max_age: ad.max_age || '',
            student_only: ad.student_only || false, working_professional_only: ad.working_professional_only || false,
            smoking_allowed: ad.smoking_allowed || false, pets_allowed: ad.pets_allowed || false,
            contact_phone: ad.contact_phone || '', available_date: ad.available_date || '',
          })
        } catch (error) { toast.error('Failed to load') }
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
        await colocationAPI.update(id, data)
        toast.success('Updated')
      } else {
        const response = await colocationAPI.create(data)
        adId = response.data.id
        toast.success('Created')
      }
      // Upload images if any
      if (imageFiles.length > 0) {
        try {
          await colocationAPI.uploadImages(adId, imageFiles)
          toast.success('Images uploaded successfully')
        } catch (error) {
          toast.error('Failed to upload images')
        }
      }
      navigate('/colocation')
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed') }
    setLoading(false)
  }

  const checkboxes = [
    { key: 'student_only', label: t('colocation.studentOnly') },
    { key: 'working_professional_only', label: t('colocation.workingProfessionalOnly') },
    { key: 'smoking_allowed', label: t('housing.smokingAllowed') },
    { key: 'pets_allowed', label: t('housing.petsAllowed') },
  ]

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-form-container">
          <h1 className="text-2xl font-bold mb-4">{isEdit ? t('common.edit') : t('colocation.createAd')}</h1>
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
                <label className="form-label">{t('colocation.monthlyRent')} (MAD)</label>
                <input type="number" name="monthly_rent" className="form-input" value={formData.monthly_rent} onChange={handleChange} required min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('common.city')}</label>
                <input type="text" name="city" className="form-input" value={formData.city} onChange={handleChange} required />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('colocation.availableRooms')}</label>
                <input type="number" name="available_rooms" className="form-input" value={formData.available_rooms} onChange={handleChange} min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('colocation.currentRoommates')}</label>
                <input type="number" name="current_roommates" className="form-input" value={formData.current_roommates} onChange={handleChange} min="0" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('colocation.preferredGender')}</label>
              <select name="preferred_gender" className="form-select" value={formData.preferred_gender} onChange={handleChange}>
                <option value="">{t('common.all')}</option>
                <option value="male">{t('profile.male')}</option>
                <option value="female">{t('profile.female')}</option>
              </select>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('colocation.minAge')}</label>
                <input type="number" name="min_age" className="form-input" value={formData.min_age} onChange={handleChange} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('colocation.maxAge')}</label>
                <input type="number" name="max_age" className="form-input" value={formData.max_age} onChange={handleChange} min="0" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('housing.contactPhone')}</label>
              <input type="tel" name="contact_phone" className="form-input" value={formData.contact_phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Preferences</label>
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
                  id="colocation-image-upload"
                />
                <label htmlFor="colocation-image-upload" className="cursor-pointer flex flex-col items-center">
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