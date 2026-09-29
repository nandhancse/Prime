import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getApiErrors } from '../api/errors.js'
import FormInput from '../components/FormInput.jsx'
import GoogleLoginButton from '../components/GoogleLoginButton.jsx'
import { useAuth } from '../context/useAuth.js'
import '../styles/auth.css'


const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim())

const initialFormData = {
  username: '',
  password: '',
  confirm_password: '',
}

function RegisterPage() {
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const { isAuthenticated, loading, register } = useAuth()
  const navigate = useNavigate()

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '', form: '' }))
  }

  function validateForm() {
    const nextErrors = {}

    if (!formData.username.trim()) nextErrors.username = 'Username is required.'
    if (!formData.password) nextErrors.password = 'Password is required.'
    if (formData.password && formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }
    if (!formData.confirm_password) {
      nextErrors.confirm_password = 'Please confirm your password.'
    } else if (formData.password !== formData.confirm_password) {
      nextErrors.confirm_password = 'Passwords do not match.'
    }

    return nextErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateForm()

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      await register({
        ...formData,
        username: formData.username.trim(),
      })
      navigate('/onboarding', { replace: true })
    } catch (error) {
      setErrors(getApiErrors(error, 'Unable to create your account. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="register-heading">
          <Link className="auth-brand" to="/" aria-label="PRime home">
            <span className="auth-brand-mark" aria-hidden="true">P</span>
            <span>PRime</span>
          </Link>

          <div className="auth-copy">
            <p className="auth-kicker">Start simple</p>
            <h1 className="auth-title" id="register-heading">Create your account.</h1>
            <p className="auth-subtitle">No profile forms. Just the basics — you can set up training next.</p>
          </div>

          {errors.form && (
            <p className="form-message error" role="alert">{errors.form}</p>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <FormInput
              id="register-username"
              label="Username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
            <FormInput
              id="register-password"
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              autoComplete="new-password"
              minLength="8"
              required
            />
            <FormInput
              id="register-confirm-password"
              label="Confirm password"
              name="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={handleChange}
              error={errors.confirm_password}
              autoComplete="new-password"
              minLength="8"
              required
            />

            <button className="button button-primary form-submit" type="submit" disabled={submitting}>
              {submitting ? 'Creating account...' : errors.retry ? 'Retry' : 'Create account'}
            </button>
          </form>

          {googleEnabled && (
            <div className="auth-social">
              <div className="auth-divider"><span>or</span></div>
              <GoogleLoginButton onError={(message) => setErrors((current) => ({ ...current, form: message }))} />
            </div>
          )}

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </main>
    </div>
  )
}

export default RegisterPage
