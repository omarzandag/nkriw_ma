import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      setSent(true)
      toast.success(t('auth.sendResetLink'))
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reset link')
    }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <h1 className="text-center text-2xl font-bold mb-2">{t('auth.forgotPasswordTitle')}</h1>
            <p className="text-center text-gray mb-4">{t('auth.resetPasswordSubtitle')}</p>

            {sent ? (
              <div className="alert alert-success">
                {t('auth.sendResetLink')}
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">{t('auth.email')}</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? <span className="spinner"></span> : t('auth.sendResetLink')}
                </button>
              </form>
            )}

            <p className="text-center mt-4 text-sm">
              <Link to="/login">{t('common.back')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}