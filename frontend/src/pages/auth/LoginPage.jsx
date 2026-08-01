import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember_me: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await login(formData)
    if (result.success) {
      const from = location.state?.from?.pathname || '/'
      navigate(from)
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
            <h1 className="text-center text-2xl font-bold mb-2">{t('auth.loginTitle')}</h1>
            <p className="text-center text-gray mb-4">{t('auth.loginSubtitle')}</p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('auth.email')}</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('auth.password')}</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-between items-center mb-4">
                <label className="form-check">
                  <input
                    type="checkbox"
                    name="remember_me"
                    checked={formData.remember_me}
                    onChange={handleChange}
                  />
                  <span className="text-sm">{t('auth.rememberMe')}</span>
                </label>
                <Link to="/forgot-password" className="text-sm">{t('auth.forgotPassword')}</Link>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? <span className="spinner"></span> : t('auth.loginButton')}
              </button>
            </form>

            <p className="text-center mt-4 text-sm">
              {t('auth.noAccount')} <Link to="/register">{t('common.register')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}