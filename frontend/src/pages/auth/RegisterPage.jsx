import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    city: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const { confirmPassword, ...data } = formData
    const result = await register(data)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <h1 className="text-center text-2xl font-bold mb-2">{t('auth.registerTitle')}</h1>
            <p className="text-center text-gray mb-4">{t('auth.registerSubtitle')}</p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('auth.fullName')}</label>
                <input type="text" name="full_name" className="form-input" value={formData.full_name} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">{t('auth.username')}</label>
                <input type="text" name="username" className="form-input" value={formData.username} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">{t('auth.email')}</label>
                <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">{t('auth.password')}</label>
                  <input type="password" name="password" className="form-input" value={formData.password} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('auth.confirmPassword')}</label>
                  <input type="password" name="confirmPassword" className="form-input" value={formData.confirmPassword} onChange={handleChange} required />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">{t('auth.phoneNumber')}</label>
                  <input type="tel" name="phone_number" className="form-input" value={formData.phone_number} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('common.city')}</label>
                  <input type="text" name="city" className="form-input" value={formData.city} onChange={handleChange} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? <span className="spinner"></span> : t('auth.registerButton')}
              </button>
            </form>

            <p className="text-center mt-4 text-sm">
              {t('auth.haveAccount')} <Link to="/login">{t('common.login')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}