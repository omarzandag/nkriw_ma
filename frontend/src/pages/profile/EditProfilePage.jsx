import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersAPI, authAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function EditProfilePage() {
  const { t } = useTranslation()
  const { updateUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '', username: '', phone_number: '', gender: '', city: '', bio: '',
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await usersAPI.getProfile()
        const p = response.data
        setFormData({
          full_name: p.full_name || '', username: p.username || '',
          phone_number: p.phone_number || '', gender: p.gender || '',
          city: p.city || '', bio: p.bio || '',
        })
      } catch (error) { toast.error('Failed to load profile') }
    }
    fetchProfile()
  }, [])

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await usersAPI.updateProfile(formData)
      updateUser(response.data)
      toast.success('Profile updated')
      navigate('/profile')
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed') }
    setLoading(false)
  }

  const handleUploadPicture = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const response = await usersAPI.uploadProfilePicture(file)
      updateUser(response.data)
      toast.success('Profile picture updated')
    } catch (error) { toast.error('Failed to upload') }
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-form-container">
          <h1 className="text-2xl font-bold mb-4">{t('profile.editProfile')}</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('profile.profilePicture')}</label>
              <input type="file" accept="image/*" onChange={handleUploadPicture} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('profile.fullName')}</label>
              <input type="text" name="full_name" className="form-input" value={formData.full_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('profile.username')}</label>
              <input type="text" name="username" className="form-input" value={formData.username} onChange={handleChange} required />
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('profile.phoneNumber')}</label>
                <input type="tel" name="phone_number" className="form-input" value={formData.phone_number} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('profile.gender')}</label>
                <select name="gender" className="form-select" value={formData.gender} onChange={handleChange}>
                  <option value="">-</option>
                  <option value="male">{t('profile.male')}</option>
                  <option value="female">{t('profile.female')}</option>
                  <option value="other">{t('profile.other')}</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('profile.city')}</label>
              <input type="text" name="city" className="form-input" value={formData.city} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('profile.bio')}</label>
              <textarea name="bio" className="form-textarea" value={formData.bio} onChange={handleChange} />
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