import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [formData, setFormData] = useState({
    token: searchParams.get('token') || '',
    new_password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.new_password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authAPI.resetPassword({ token: formData.token, new_password: formData.new_password })
      toast.success(t('auth.resetPassword'))
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Reset failed')
    }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <h1 className="text-center text-2xl font-bold mb-2">{t('auth.resetPassword')}</h1>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('auth.newPassword')}</label>
                <input type="password" name="new_password" className="form-input" value={formData.new_password} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.confirmPassword')}</label>
                <input type="password" name="confirmPassword" className="form-input" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? <span className="spinner"></span> : t('auth.resetPassword')}
              </button>
            </form>
            <p className="text-center mt-4 text-sm">
              <Link to="/login">{t('common.back')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}