import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { activateProgram, deleteProgram, getProgram } from '../api/programs.js'
import { startWorkout } from '../api/workouts.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PageHeader from '../components/PageHeader.jsx'


function ProgramDetailPage() {
  const { programId } = useParams()
  const [program, setProgram] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const loadProgram = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setProgram(await getProgram(programId))
    } catch {
      setError('This workout program could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [programId])

  useEffect(() => { loadProgram() }, [loadProgram])

  async function handleActivate() {
    setBusy(true)
    try {
      setProgram(await activateProgram(program.id))
    } catch {
      setError('The program could not be activated.')
    } finally {
      setBusy(false)
    }
  }

  async function handleStart(dayId) {
    setBusy(true)
    setError('')
    try {
      const workout = await startWorkout(dayId)
      navigate(`/workout/${workout.id}`)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.response?.data?.program_day_id || 'The workout could not be started.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteProgram(program.id)
      navigate('/programs', { replace: true })
    } catch {
      setError('The program could not be deleted.')
      setDeleteOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="app-page"><LoadingSpinner label="Loading program..." /></main>

  return (
    <main className="app-page">
      <PageHeader
        title={program?.name || 'Program'}
        actions={program && (
          <>
            {!program.is_active && <button className="button button-primary" type="button" onClick={handleActivate} disabled={busy}>Activate</button>}
            <Link className="button button-secondary" to={`/programs/${program.id}/edit`}>Edit</Link>
          </>
        )}
      />

      {location.state?.message && <p className="status-banner success" role="status">{location.state.message}</p>}
      <ErrorMessage message={error} onRetry={loadProgram} />

      {program && (
        <>
          <section className="program-detail-days">
            {program.days.map((day, index) => (
              <article className={`program-detail-day${day.is_rest_day ? ' rest' : ''}`} key={day.id}>
                <div className="detail-day-header">
                  <div>
                    <span>Day {index + 1} · {day.day_of_week_display}</span>
                    <h2>{day.name}</h2>
                  </div>
                  {day.is_rest_day ? (
                    <span className="badge rest">Rest day</span>
                  ) : (
                    <button className="button button-primary button-small" type="button" disabled={busy} onClick={() => handleStart(day.id)}>Start Workout</button>
                  )}
                </div>
                {!day.is_rest_day && (
                  <div className="detail-exercise-list">
                    {day.exercises.map((item) => (
                      <details className="program-exercise-row" key={item.id}>
                        <summary>
                        <div>
                          <strong>{item.exercise.name}</strong>
                          <span>{item.target_sets} × {item.target_reps_min}–{item.target_reps_max}</span>
                        </div>
                        </summary>
                        <p>Weight: {Number(item.target_weight)} kg</p>
                        <p>Rest: {item.rest_seconds} sec</p>
                        {item.notes && <p>Notes: {item.notes}</p>}
                      </details>
                    ))}
                    {day.exercises.length === 0 && <p className="inline-empty">No exercises have been added.</p>}
                  </div>
                )}
              </article>
            ))}
          </section>

          <div className="danger-zone">
            <div><strong>Delete program</strong><p>Planned days are removed. Completed history stays safe.</p></div>
            <button className="button button-danger" type="button" onClick={() => setDeleteOpen(true)}>Delete Program</button>
          </div>
        </>
      )}

      <ConfirmModal open={deleteOpen} title="Delete workout program?" message="This removes the program and its planned days. Completed workouts remain in history." confirmLabel="Delete program" danger busy={busy} onCancel={() => setDeleteOpen(false)} onConfirm={handleDelete} />
    </main>
  )
}

export default ProgramDetailPage
