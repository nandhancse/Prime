import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getApiErrors } from '../api/errors.js'
import FormInput from '../components/FormInput.jsx'
import GoogleLoginButton from '../components/GoogleLoginButton.jsx'
import { useAuth } from '../context/useAuth.js'
import '../styles/auth.css'


function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const { isAuthenticated, loading, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '', form: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {}

    if (!formData.username.trim()) nextErrors.username = 'Username is required.'
    if (!formData.password) nextErrors.password = 'Password is required.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      await login({
        username: formData.username.trim(),
        password: formData.password,
      })
      const destination = location.state?.from?.pathname || '/dashboard'
      navigate(destination, { replace: true })
    } catch (error) {
      setErrors(getApiErrors(error, 'Unable to log in. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="login-heading">
          <Link className="auth-brand" to="/">PRime</Link>
          <h1 className="auth-title" id="login-heading">Welcome back</h1>

          {location.state?.message && (
            <p className="form-message success" role="status">{location.state.message}</p>
          )}
          {errors.form && (
            <p className="form-message error" role="alert">{errors.form}</p>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <FormInput
              id="login-username"
              label="Username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              autoComplete="username"
              required
            />
            <FormInput
              id="login-password"
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              autoComplete="current-password"
              required
            />

            <button className="button button-primary form-submit" type="submit" disabled={submitting}>
              {submitting ? 'Logging in...' : errors.retry ? 'Retry' : 'Login'}
            </button>
          </form>

          <div className="auth-divider"><span>OR</span></div>
          <GoogleLoginButton onError={(message) => setErrors((current) => ({ ...current, form: message }))} />

          <p className="auth-switch">
            <Link to="/register">Create account</Link>
          </p>
        </section>
      </main>
    </div>
  )
}

export default LoginPage
