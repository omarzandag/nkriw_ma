import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { FaEnvelope, FaSave, FaPaperPlane } from 'react-icons/fa'
import './Admin.css'

const EMPTY_FORM = {
  enabled: false,
  host: '',
  port: 587,
  user: '',
  password: '',
  from_email: '',
  from_name: 'NKRIW.MA',
  use_tls: true,
  use_ssl: false,
}

export default function AdminSettingsPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [passwordSet, setPasswordSet] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await adminAPI.getSmtpSettings()
        setForm({
          enabled: data.enabled,
          host: data.host || '',
          port: data.port || 587,
          user: data.user || '',
          password: '', // never returned by the API
          from_email: data.from_email || '',
          from_name: data.from_name || 'NKRIW.MA',
          use_tls: data.use_tls,
          use_ssl: data.use_ssl,
        })
        setPasswordSet(data.password_set)
      } catch {
        toast.error('Failed to load email settings')
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Send only provided fields; omit password to keep the stored one
      const payload = {
        enabled: form.enabled,
        host: form.host,
        port: Number(form.port) || 587,
        user: form.user,
        from_email: form.from_email,
        from_name: form.from_name,
        use_tls: form.use_tls,
        use_ssl: form.use_ssl,
      }
      if (form.password) {
        payload.password = form.password
      }
      const { data } = await adminAPI.updateSmtpSettings(payload)
      setPasswordSet(data.password_set)
      setForm((prev) => ({ ...prev, password: '' }))
      toast.success(t('admin.emailSettingsSaved'))
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings')
    }
    setSaving(false)
  }

  const handleTest = async (e) => {
    e.preventDefault()
    if (!testEmail) {
      toast.error(t('admin.enterTestEmail'))
      return
    }
    setTesting(true)
    try {
      await adminAPI.testSmtpEmail({ to_email: testEmail })
      toast.success(t('admin.testEmailSent'))
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Test email failed')
    }
    setTesting(false)
  }

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>

  const configured = form.enabled && form.host && form.user

  return (
    <div className="page-container">
      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-sm">
            <FaEnvelope /> {t('admin.emailSettings')}
          </h1>
          <Link to="/admin" className="btn btn-outline">{t('admin.title')}</Link>
        </div>

        {/* Status banner */}
        <div className={`alert ${configured ? 'alert-success' : 'alert-warning'}`} style={{ marginBottom: '1rem' }}>
          {configured
            ? t('admin.smtpConfigured')
            : t('admin.smtpNotConfigured')}
        </div>

        <form onSubmit={handleSave}>
          {/* Enable toggle */}
          <div className="card mb-4">
            <div className="card-body">
              <label className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  name="enabled"
                  checked={form.enabled}
                  onChange={handleChange}
                />
                <span style={{ fontWeight: 600 }}>{t('admin.enableEmail')}</span>
              </label>
              <p className="text-sm text-gray mt-2">{t('admin.enableEmailHint')}</p>
            </div>
          </div>

          {/* SMTP server */}
          <div className="card mb-4">
            <div className="card-header">{t('admin.smtpServer')}</div>
            <div className="card-body">
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">{t('admin.smtpHost')}</label>
                  <input
                    type="text"
                    name="host"
                    className="form-input"
                    value={form.host}
                    onChange={handleChange}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin.smtpPort')}</label>
                  <input
                    type="number"
                    name="port"
                    className="form-input"
                    value={form.port}
                    onChange={handleChange}
                    min={1}
                    max={65535}
                  />
                </div>
              </div>

              <div className="flex gap-md mb-2">
                <label className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" name="use_tls" checked={form.use_tls} onChange={handleChange} />
                  <span className="text-sm">STARTTLS <span className="text-gray">(587)</span></span>
                </label>
                <label className="form-check" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" name="use_ssl" checked={form.use_ssl} onChange={handleChange} />
                  <span className="text-sm">SSL/TLS <span className="text-gray">(465)</span></span>
                </label>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="card mb-4">
            <div className="card-header">{t('admin.smtpCredentials')}</div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">{t('admin.smtpUser')}</label>
                <input
                  type="text"
                  name="user"
                  className="form-input"
                  value={form.user}
                  onChange={handleChange}
                  placeholder="you@gmail.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t('admin.smtpPassword')}
                  {passwordSet && <span className="text-gray text-sm" style={{ marginLeft: 8 }}>({t('admin.passwordAlreadySet')})</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={passwordSet ? '••••••••' : ''}
                  autoComplete="new-password"
                />
                <p className="text-sm text-gray mt-2">{t('admin.smtpPasswordHint')}</p>
              </div>
            </div>
          </div>

          {/* Sender identity */}
          <div className="card mb-4">
            <div className="card-header">{t('admin.senderIdentity')}</div>
            <div className="card-body">
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">{t('admin.fromEmail')}</label>
                  <input
                    type="email"
                    name="from_email"
                    className="form-input"
                    value={form.from_email}
                    onChange={handleChange}
                    placeholder="noreply@nkriw.ma"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin.fromName')}</label>
                  <input
                    type="text"
                    name="from_name"
                    className="form-input"
                    value={form.from_name}
                    onChange={handleChange}
                    placeholder="NKRIW.MA"
                  />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block mb-4" disabled={saving}>
            {saving ? <span className="spinner"></span> : <><FaSave /> {t('common.save')}</>}
          </button>
        </form>

        {/* Test email */}
        <div className="card">
          <div className="card-header"><FaPaperPlane /> {t('admin.testEmail')}</div>
          <div className="card-body">
            <p className="text-sm text-gray mb-4">{t('admin.testEmailHint')}</p>
            <form onSubmit={handleTest} className="flex gap-sm">
              <input
                type="email"
                className="form-input"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                required
              />
              <button type="submit" className="btn btn-outline" disabled={testing || !configured}>
                {testing ? <span className="spinner"></span> : t('admin.sendTestEmail')}
              </button>
            </form>
            <p className="text-sm text-gray mt-2">{t('admin.testEmailRequiresSave')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
