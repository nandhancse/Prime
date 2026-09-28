import { useCallback, useEffect, useState } from 'react'
import api from '../api/axios.js'
import { getExercises } from '../api/exercises.js'
import { getPrograms } from '../api/programs.js'
import { getActiveWorkout } from '../api/workouts.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/useAuth.js'


const checkDefinitions = [
  { key: 'health', label: 'Backend health' },
  { key: 'profile', label: 'Profile API' },
  { key: 'exercises', label: 'Exercises API' },
  { key: 'programs', label: 'Programs API' },
  { key: 'activeWorkout', label: 'Active workout API' },
]

function statusFor(result, emptyWhen) {
  if (result.status === 'rejected') return 'Failed'
  if (emptyWhen(result.value)) return 'No data'
  return 'Connected'
}

function DevStatusPage() {
  const { isAuthenticated, user } = useAuth()
  const [checks, setChecks] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const runChecks = useCallback(async () => {
    setLoading(true)
    setError('')

    const results = await Promise.allSettled([
      api.get('health/').then((response) => response.data),
      api.get('auth/profile/').then((response) => response.data),
      getExercises(),
      getPrograms(),
      getActiveWorkout(),
    ])

    const nextChecks = {
      health: statusFor(results[0], (value) => value?.status !== 'ok'),
      profile: statusFor(results[1], (value) => !value?.username),
      exercises: statusFor(results[2], (value) => !Array.isArray(value) || value.length === 0),
      programs: statusFor(results[3], (value) => !Array.isArray(value) || value.length === 0),
      activeWorkout: statusFor(results[4], (value) => !value),
    }

    setChecks(nextChecks)
    if (Object.values(nextChecks).includes('Failed')) {
      setError('One or more development checks failed. Confirm the backend is running, then retry.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    runChecks()
  }, [runChecks])

  return (
    <main className="app-page">
      <PageHeader
        eyebrow="Development diagnostics"
        title="PRime system status"
        description="A safe overview of the local API connections used by the current session. No credentials or tokens are displayed."
        actions={(
          <button className="button button-secondary" type="button" onClick={runChecks} disabled={loading}>
            {loading ? 'Checking...' : 'Run checks'}
          </button>
        )}
      />

      <section className="diagnostic-identity" aria-label="Authentication status">
        <div>
          <span>Authentication</span>
          <strong>{isAuthenticated ? 'Connected' : 'Not authenticated'}</strong>
        </div>
        <div>
          <span>Current username</span>
          <strong>{user?.username || 'Not authenticated'}</strong>
        </div>
      </section>

      <ErrorMessage message={error} onRetry={runChecks} />

      {loading ? (
        <LoadingSpinner label="Checking PRime services..." />
      ) : (
        <section className="diagnostic-grid" aria-live="polite" aria-label="API connection checks">
          {checkDefinitions.map((check) => {
            const value = checks[check.key] || 'Failed'
            return (
              <article className={`diagnostic-card status-${value.toLowerCase().replaceAll(' ', '-')}`} key={check.key}>
                <span>{check.label}</span>
                <strong>{value}</strong>
                <small>{value === 'Failed' ? 'Request did not succeed' : 'Local development check'}</small>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}

export default DevStatusPage
