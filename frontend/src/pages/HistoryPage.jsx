import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkoutHistory } from '../api/workouts.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { formatDate, formatDuration, formatVolume } from '../utils/format.js'


function HistoryPage() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setWorkouts(await getWorkoutHistory())
    } catch {
      setError('Workout history could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  return (
    <main className="app-page">
      <PageHeader title="History" />
      <ErrorMessage message={error} onRetry={loadHistory} />
      {loading ? (
        <LoadingSpinner label="Loading workout history..." />
      ) : workouts.length === 0 ? (
        <EmptyState title="No workouts yet." message="Start your first workout.">
          <Link className="button button-primary" to="/dashboard">Go to dashboard</Link>
        </EmptyState>
      ) : (
        <section className="history-list">
          {workouts.map((workout) => (
            <Link className="history-card" key={workout.id} to={`/history/${workout.id}`}>
              <div className="history-main"><h2>{workout.name}</h2><span>{formatDate(workout.started_at)} · {formatDuration(workout.duration_seconds)}</span><p>{workout.completed_sets_count} sets · {formatVolume(workout.total_volume)}</p></div>
              <span className="history-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}

export default HistoryPage
