import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../api/axios.js'
import Navbar from '../components/Navbar.jsx'


function LandingPage() {
  const [backendStatus, setBackendStatus] = useState('checking')

  const checkBackend = useCallback(async (signal) => {
    setBackendStatus('checking')
    try {
      const response = await axios.get(`${API_BASE_URL}health/`, { signal })
      setBackendStatus(response.data.status === 'ok' ? 'connected' : 'unavailable')
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        setBackendStatus('unavailable')
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    checkBackend(controller.signal)
    return () => controller.abort()
  }, [checkBackend])

  const statusText = {
    checking: 'Checking backend',
    connected: 'Backend connected',
    unavailable: 'Backend unavailable',
  }[backendStatus]

  return (
    <div className="landing-page">
      <Navbar />

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Strength, simplified</p>
            <h1 className="hero-title">Build strength.<br />Track progress.</h1>
            <p className="hero-description">
              A focused workout companion that helps you stay consistent,
              understand your training, and keep moving forward.
            </p>

            <div className="hero-actions">
              <Link className="button button-primary" to="/register">
                Get Started
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link className="button button-secondary" to="/login">
                Login
              </Link>
            </div>

            <div className={`connection-status ${backendStatus}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              {statusText}
              {backendStatus === 'unavailable' && (
                <button className="connection-retry" type="button" onClick={() => checkBackend()}>
                  Retry
                </button>
              )}
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="weight weight-left">
              <span />
              <span />
            </div>
            <div className="barbell-bar" />
            <div className="weight weight-right">
              <span />
              <span />
            </div>
            <p>ONE REP<br />AT A TIME</p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Train with purpose.</span>
        <span>PRime &copy; 2026</span>
      </footer>
    </div>
  )
}

export default LandingPage
