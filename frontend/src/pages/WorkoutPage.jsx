import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  addWorkoutSet,
  cancelWorkout,
  completeWorkout,
  getWorkout,
  removeWorkoutSet,
  updateWorkoutSet,
} from '../api/workouts.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import RestTimer from '../components/RestTimer.jsx'
import WorkoutSetRow from '../components/WorkoutSetRow.jsx'
import { useAuth } from '../context/useAuth.js'
import { formatDuration, formatWeight } from '../utils/format.js'


function WorkoutPage() {
  const { sessionId } = useParams()
  const [workout, setWorkout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [finishOpen, setFinishOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [restTimer, setRestTimer] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const unit = user.preferred_weight_unit || 'kg'

  const loadWorkout = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getWorkout(sessionId)
      if (data.status === 'completed') {
        navigate(`/history/${data.id}`, { replace: true })
        return
      }
      setWorkout(data)
    } catch {
      setError('The workout session could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [navigate, sessionId])

  useEffect(() => { loadWorkout() }, [loadWorkout])

  useEffect(() => {
    if (!workout?.started_at) return undefined
    function updateElapsed() {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(workout.started_at).getTime()) / 1000)))
    }
    updateElapsed()
    const interval = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(interval)
  }, [workout?.started_at])

  const incompleteSets = useMemo(
    () => workout?.exercises.reduce(
      (total, exercise) => total + exercise.sets.filter((item) => !item.is_completed).length,
      0,
    ) || 0,
    [workout],
  )

  function replaceSet(setId, nextSet) {
    setWorkout((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((item) => item.id === setId ? nextSet : item),
      })),
    }))
  }

  async function saveSet(setId, data) {
    const updated = await updateWorkoutSet(setId, data)
    replaceSet(setId, updated)
    return updated
  }

  async function handleAddSet(exerciseId) {
    setError('')
    try {
      const created = await addWorkoutSet(exerciseId)
      setWorkout((current) => ({
        ...current,
        exercises: current.exercises.map((exercise) => (
          exercise.id === exerciseId
            ? { ...exercise, sets: [...exercise.sets, created] }
            : exercise
        )),
      }))
    } catch {
      setError('The extra set could not be added.')
    }
  }

  async function handleRemoveSet() {
    if (!removeTarget) return
    setBusy(true)
    try {
      await removeWorkoutSet(removeTarget.id)
      setWorkout((current) => ({
        ...current,
        exercises: current.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.filter((item) => item.id !== removeTarget.id),
        })),
      }))
      setRemoveTarget(null)
    } catch {
      setError('The set could not be removed.')
      setRemoveTarget(null)
    } finally {
      setBusy(false)
    }
  }

  async function finishWorkout() {
    setBusy(true)
    setError('')
    try {
      const completed = await completeWorkout(workout.id)
      navigate(`/history/${completed.id}`, {
        replace: true,
        state: { message: 'Workout completed. Strong work.' },
      })
    } catch {
      setError('The workout could not be completed.')
      setFinishOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    setBusy(true)
    try {
      await cancelWorkout(workout.id)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('The workout could not be cancelled.')
      setCancelOpen(false)
    } finally {
      setBusy(false)
    }
  }

  function requestFinish() {
    if (incompleteSets > 0 && user.confirm_before_incomplete_workout !== false) setFinishOpen(true)
    else finishWorkout()
  }

  function requestCancel() {
    if (user.confirm_before_cancel_workout === false) handleCancel()
    else setCancelOpen(true)
  }

  function startRest(seconds) {
    if (seconds > 0) setRestTimer({ duration: seconds, key: Date.now() })
  }

  if (loading) return <main className="workout-page"><LoadingSpinner label="Loading active workout..." /></main>

  return (
    <main className={`workout-page${user.compact_workout_layout ? ' compact' : ''}`}>
      {workout && (
        <>
          <header className="workout-header">
            <div>
              <h1>{workout.name}</h1>
              <p><strong>{formatDuration(elapsed)}</strong></p>
            </div>
            <div className="workout-header-actions">
              <button className="button button-primary" type="button" onClick={requestFinish} disabled={busy}>Finish</button>
              <button className="text-button danger" type="button" onClick={requestCancel}>Cancel</button>
            </div>
          </header>

          <ErrorMessage message={error} onRetry={loadWorkout} />

          <div className="workout-exercise-stack">
            {workout.exercises.map((exercise, index) => {
              return (
                <section className="workout-exercise-card" key={exercise.id}>
                  <div className="workout-exercise-heading">
                    <div>
                      <span>Exercise {index + 1}</span>
                      <h2>{exercise.exercise_name}</h2>
                      {exercise.previous_performance?.length > 0 && <p className="previous-performance">Previous: {exercise.previous_performance.map((item) => `${formatWeight(item.weight, unit).replace(` ${unit}`, '')} × ${item.reps}`).join(', ')}</p>}
                      {exercise.notes && <details className="exercise-info"><summary>Notes</summary><p>{exercise.notes}</p></details>}
                    </div>
                  </div>
                  <div className="set-table-heading"><span>Set</span><span>{unit.toUpperCase()}</span><span>Reps</span><span>Done</span><span /></div>
                  <div className="workout-sets">
                    {exercise.sets.map((workoutSet) => (
                      <WorkoutSetRow key={workoutSet.id} workoutSet={workoutSet} unit={unit} restSeconds={exercise.rest_seconds} onSave={saveSet} onCompleted={startRest} onRequestRemove={setRemoveTarget} />
                    ))}
                  </div>
                  <button className="add-set-button" type="button" onClick={() => handleAddSet(exercise.id)}>+ Add Set</button>
                </section>
              )
            })}
          </div>

          <div className="workout-mobile-finish">
            <div><span>Elapsed</span><strong>{formatDuration(elapsed)}</strong></div>
            <button className="button button-primary" type="button" onClick={requestFinish} disabled={busy}>Finish</button>
          </div>
        </>
      )}

      <ConfirmModal open={finishOpen} title="Finish with incomplete sets?" message={`${incompleteSets} planned ${incompleteSets === 1 ? 'set is' : 'sets are'} still incomplete. You can return to the workout or complete it now.`} confirmLabel="Complete anyway" busy={busy} onCancel={() => setFinishOpen(false)} onConfirm={finishWorkout} />
      <ConfirmModal open={cancelOpen} title="Cancel this workout?" message="The session will be marked cancelled and excluded from normal workout history. It will not be silently deleted." confirmLabel="Cancel workout" danger busy={busy} onCancel={() => setCancelOpen(false)} onConfirm={handleCancel} />
      <ConfirmModal open={Boolean(removeTarget)} title="Remove this set?" message={`Set ${removeTarget?.set_number || ''} will be removed from the active workout.`} confirmLabel="Remove set" danger busy={busy} onCancel={() => setRemoveTarget(null)} onConfirm={handleRemoveSet} />
      {restTimer && <RestTimer duration={restTimer.duration} timerKey={restTimer.key} onSkip={() => setRestTimer(null)} />}
    </main>
  )
}

export default WorkoutPage
