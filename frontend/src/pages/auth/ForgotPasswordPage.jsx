import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

// 3-step flow: 'email' -> 'otp' -> 'password'
export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // OTP inputs (6 boxes)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef([])

  // New password
  const [passwords, setPasswords] = useState({ new_password: '', confirm: '' })
  const [resendCooldown, setResendCooldown] = useState(0)

  // Countdown for the resend button
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Step 1: request the OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      setStep('otp')
      setResendCooldown(60)
      toast.success(t('auth.otpSent'))
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reset code')
    }
    setLoading(false)
  }

  // OTP box handlers
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = ['', '', '', '', '', '']
    pasted.split('').forEach((d, i) => { next[i] = d })
    setOtp(next)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const otpCode = otp.join('')

  // Step 2: verify the OTP (validates before showing the password form)
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otpCode.length !== 6) {
      toast.error(t('auth.otpInvalid'))
      return
    }
    setLoading(true)
    try {
      await authAPI.verifyOtp({ email, otp: otpCode })
      setStep('password')
      toast.success(t('auth.otpVerified'))
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.otpInvalid'))
    }
    setLoading(false)
  }

  // Step 3: set the new password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (passwords.new_password !== passwords.confirm) {
      toast.error(t('auth.passwordsDoNotMatch'))
      return
    }
    if (passwords.new_password.length < 6) {
      toast.error(t('auth.passwordTooShort'))
      return
    }
    setLoading(true)
    try {
      await authAPI.resetPassword({ email, otp: otpCode, new_password: passwords.new_password })
      toast.success(t('auth.passwordResetSuccess'))
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Reset failed')
      // Code may have expired mid-flow — send the user back to the OTP step
      setStep('otp')
    }
    setLoading(false)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      setResendCooldown(60)
      setOtp(['', '', '', '', '', ''])
      toast.success(t('auth.otpSent'))
      otpRefs.current[0]?.focus()
    } catch {
      toast.error('Failed to resend code')
    }
    setLoading(false)
  }

  // Step indicator
  const steps = ['email', 'otp', 'password']
  const currentIndex = steps.indexOf(step)

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <h1 className="text-2xl font-bold mb-2 text-center">{t('auth.forgotPasswordTitle')}</h1>
            <p className="text-center text-gray mb-4">{t('auth.resetPasswordSubtitle')}</p>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-sm mb-4">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-sm">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      fontSize: '0.8rem', fontWeight: 600,
                      background: i <= currentIndex ? 'var(--color-primary)' : 'var(--color-gray-200)',
                      color: i <= currentIndex ? '#fff' : 'var(--color-gray-500)',
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ width: 32, height: 2, background: i < currentIndex ? 'var(--color-primary)' : 'var(--color-gray-200)' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: email */}
            {step === 'email' && (
              <form onSubmit={handleRequestOtp}>
                <div className="form-group">
                  <label className="form-label">{t('auth.email')}</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>
                <p className="text-sm text-gray mb-4">{t('auth.otpWillBeSent')}</p>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? <span className="spinner"></span> : t('auth.sendResetLink')}
                </button>
              </form>
            )}

            {/* Step 2: OTP code */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp}>
                <p className="text-center mb-4">
                  {t('auth.otpSentTo')} <strong>{email}</strong>
                </p>
                <div className="flex justify-center gap-sm mb-4" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="form-input otp-input"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                <button type="submit" className="btn btn-primary btn-block mb-4" disabled={loading || otpCode.length !== 6}>
                  {loading ? <span className="spinner"></span> : t('auth.verifyCode')}
                </button>
                <div className="text-center">
                  <button type="button" className="text-sm" onClick={handleResend} disabled={loading || resendCooldown > 0} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: resendCooldown > 0 ? 'default' : 'pointer' }}>
                    {resendCooldown > 0
                      ? `${t('auth.resendCode')} (${resendCooldown}s)`
                      : t('auth.resendCode')}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: new password */}
            {step === 'password' && (
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label className="form-label">{t('auth.newPassword')}</label>
                  <input
                    type="password"
                    name="new_password"
                    className="form-input"
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('auth.confirmPassword')}</label>
                  <input
                    type="password"
                    name="confirm"
                    className="form-input"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? <span className="spinner"></span> : t('auth.resetPassword')}
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
