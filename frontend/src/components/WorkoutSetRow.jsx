import { useRef, useState } from 'react'
import { Check, Circle, Trash2 } from 'lucide-react'
import { displayWeight, storedWeight } from '../utils/format.js'


function WorkoutSetRow({ workoutSet, unit = 'kg', restSeconds, onSave, onCompleted, onRequestRemove }) {
  const [weight, setWeight] = useState(String(Number(displayWeight(workoutSet.weight, unit).toFixed(2))))
  const [reps, setReps] = useState(String(workoutSet.reps))
  const [status, setStatus] = useState('')
  const saveQueue = useRef(Promise.resolve())

  function save(changes = {}) {
    const payload = {
      weight: weight === '' ? 0 : Number(storedWeight(weight, unit).toFixed(2)),
      reps: reps === '' ? 0 : Number(reps),
      ...changes,
    }

    setStatus('Saving...')
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => onSave(workoutSet.id, payload))
      .then(() => {
        setStatus('Saved')
        if (changes.is_completed === true) onCompleted(restSeconds)
      })
      .catch(() => setStatus('Save failed'))

    return saveQueue.current
  }

  function saveIfChanged() {
    if (Number(storedWeight(weight, unit).toFixed(2)) !== Number(workoutSet.weight) || Number(reps) !== Number(workoutSet.reps)) {
      save()
    }
  }

  return (
    <div className={`workout-set-row${workoutSet.is_completed ? ' completed' : ''}`}>
      <span className="set-number">{workoutSet.set_number}</span>
      <label>
        <span>{unit.toUpperCase()}</span>
        <input type="number" min="0" step="0.25" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} onBlur={saveIfChanged} />
      </label>
      <label>
        <span>Reps</span>
        <input type="number" min="0" inputMode="numeric" value={reps} onChange={(event) => setReps(event.target.value)} onBlur={saveIfChanged} />
      </label>
      <button className={`set-complete-button${workoutSet.is_completed ? ' checked' : ''}`} type="button" onClick={() => save({ is_completed: !workoutSet.is_completed })}>
        {workoutSet.is_completed ? <Check size={20} aria-label="Completed" /> : <Circle size={20} aria-label="Complete set" />}
      </button>
      {workoutSet.is_extra && !workoutSet.is_completed && <button className="set-remove-button" type="button" aria-label={`Remove set ${workoutSet.set_number}`} onClick={() => onRequestRemove(workoutSet)}><Trash2 size={18} /></button>}
      <small className={status === 'Save failed' ? 'save-error' : ''} aria-live="polite">{status}</small>
    </div>
  )
}

export default WorkoutSetRow
