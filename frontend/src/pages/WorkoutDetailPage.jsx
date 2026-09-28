import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getWorkout } from '../api/workouts.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { formatDate, formatDuration, formatVolume } from '../utils/format.js'


function WorkoutDetailPage() {
  const { sessionId } = useParams()
  const [workout, setWorkout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const location = useLocation()

  const loadWorkout = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setWorkout(await getWorkout(sessionId))
    } catch {
      setError('The completed workout could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { loadWorkout() }, [loadWorkout])

  if (loading) return <main className="app-page"><LoadingSpinner label="Loading workout details..." /></main>

  return (
    <main className="app-page">
      <PageHeader
        title={workout?.name || 'Workout details'}
        description={workout ? `${formatDate(workout.started_at)} · ${formatDuration(workout.duration_seconds)}` : ''}
        actions={<Link className="button button-secondary" to="/history">Back to History</Link>}
      />
      {location.state?.message && <p className="status-banner success" role="status">{location.state.message}</p>}
      <ErrorMessage message={error} onRetry={loadWorkout} />

      {workout && (
        <>
          <section className="workout-summary-grid compact-summary">
            <div><span>Volume</span><strong>{formatVolume(workout.total_volume)}</strong></div>
            <div><span>Completed sets</span><strong>{workout.completed_sets_count}</strong></div>
          </section>
          {workout.notes && <section className="workout-notes"><span>Workout notes</span><p>{workout.notes}</p></section>}
          <div className="history-exercise-stack">
            {workout.exercises.map((exercise) => (
              <section className="history-exercise-card" key={exercise.id}>
                <div><h2>{exercise.exercise_name}</h2>{exercise.notes && <p>{exercise.notes}</p>}</div>
                <div className="history-set-lines">{exercise.sets.map((workoutSet) => <span className={workoutSet.is_completed ? 'completed' : ''} key={workoutSet.id}>{workoutSet.is_completed ? `${Number(workoutSet.weight)} × ${workoutSet.reps}` : `Set ${workoutSet.set_number} incomplete`}</span>)}</div>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  )
}

export default WorkoutDetailPage
