import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPrograms } from '../api/programs.js'
import { getActiveWorkout, startWorkout } from '../api/workouts.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PageHeader from '../components/PageHeader.jsx'


function WorkoutHubPage() {
  const [program, setProgram] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [active, programs] = await Promise.all([getActiveWorkout(), getPrograms()])
      if (active) {
        navigate(`/workout/${active.id}`, { replace: true })
        return
      }
      setProgram(programs.find((item) => item.is_active) || null)
    } catch {
      setError('Workout could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => { load() }, [load])

  async function begin(dayId) {
    setStarting(dayId)
    try {
      const workout = await startWorkout(dayId)
      navigate(`/workout/${workout.id}`)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Workout could not be started.')
      setStarting(null)
    }
  }

  if (loading) return <main className="app-page narrow-page"><LoadingSpinner label="Loading workout..." /></main>

  return (
    <main className="app-page narrow-page">
      <PageHeader title="Workout" />
      <ErrorMessage message={error} onRetry={load} />
      {!program ? (
        <EmptyState title="No active program." message="Create or activate one to start." />
      ) : (
        <section className="simple-stack">
          <h2>{program.name}</h2>
          {program.days.map((day) => (
            <article className="workout-choice" key={day.id}>
              <div>
                <strong>{day.name}</strong>
                <span>{day.is_rest_day ? 'Rest day' : `${day.exercises.length} exercises`}</span>
              </div>
              {!day.is_rest_day && (
                <button className="button button-primary button-small" type="button" disabled={starting === day.id} onClick={() => begin(day.id)}>
                  {starting === day.id ? 'Starting...' : 'Start'}
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default WorkoutHubPage
