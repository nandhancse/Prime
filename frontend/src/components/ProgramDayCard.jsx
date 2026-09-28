import { useState } from 'react'
import ExerciseSelector from './ExerciseSelector.jsx'


function ProgramDayCard({ day, index, totalDays, exerciseLibrary, onChange, onMove, onRemove }) {
  const [selectorOpen, setSelectorOpen] = useState(false)

  function addExercise(exercise) {
    onChange({
      ...day,
      exercises: [
        ...day.exercises,
        {
          localId: crypto.randomUUID(),
          exercise_id: exercise.id,
          exercise,
          order: day.exercises.length,
          target_sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_weight: '0',
          rest_seconds: 90,
          notes: '',
        },
      ],
    })
    setSelectorOpen(false)
  }

  function updateExercise(exerciseIndex, field, value) {
    onChange({
      ...day,
      exercises: day.exercises.map((exercise, currentIndex) => (
        currentIndex === exerciseIndex ? { ...exercise, [field]: value } : exercise
      )),
    })
  }

  function moveExercise(exerciseIndex, direction) {
    const target = exerciseIndex + direction
    if (target < 0 || target >= day.exercises.length) return
    const items = [...day.exercises]
    const [moved] = items.splice(exerciseIndex, 1)
    items.splice(target, 0, moved)
    onChange({ ...day, exercises: items.map((item, order) => ({ ...item, order })) })
  }

  function removeExercise(exerciseIndex) {
    onChange({
      ...day,
      exercises: day.exercises
        .filter((_, currentIndex) => currentIndex !== exerciseIndex)
        .map((item, order) => ({ ...item, order })),
    })
  }

  return (
    <section className="program-day-card">
      <div className="program-day-heading">
        <div>
          <span className="day-index">Day {index + 1}</span>
          <strong>{day.name || 'Untitled workout day'}</strong>
        </div>
        <div className="reorder-actions">
          <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label="Move day up">↑</button>
          <button type="button" onClick={() => onMove(index, 1)} disabled={index === totalDays - 1} aria-label="Move day down">↓</button>
          <button className="danger" type="button" onClick={() => onRemove(index)}>Remove</button>
        </div>
      </div>

      {!day.is_rest_day && (
        <div className="day-exercise-builder">
          {day.exercises.map((item, exerciseIndex) => (
            <article className="planned-exercise" key={item.localId || item.id}>
              <div className="planned-exercise-heading">
                <div>
                  <span>Exercise {exerciseIndex + 1}</span>
                  <h3>{item.exercise.name}</h3>
                </div>
                <div className="reorder-actions">
                  <button type="button" onClick={() => moveExercise(exerciseIndex, -1)} disabled={exerciseIndex === 0}>↑</button>
                  <button type="button" onClick={() => moveExercise(exerciseIndex, 1)} disabled={exerciseIndex === day.exercises.length - 1}>↓</button>
                  <button className="danger" type="button" onClick={() => removeExercise(exerciseIndex)}>Remove</button>
                </div>
              </div>
              <div className="exercise-target-grid">
                <label><span>Sets</span><input type="number" min="1" inputMode="numeric" value={item.target_sets} onChange={(event) => updateExercise(exerciseIndex, 'target_sets', event.target.value)} /></label>
                <label><span>Min reps</span><input type="number" min="1" inputMode="numeric" value={item.target_reps_min} onChange={(event) => updateExercise(exerciseIndex, 'target_reps_min', event.target.value)} /></label>
                <label><span>Max reps</span><input type="number" min="1" inputMode="numeric" value={item.target_reps_max} onChange={(event) => updateExercise(exerciseIndex, 'target_reps_max', event.target.value)} /></label>
              </div>
              <details className="more-options">
                <summary>More options</summary>
                <div className="form-grid-two">
                  <label><span>Weight (kg)</span><input type="number" min="0" step="0.25" inputMode="decimal" value={item.target_weight} onChange={(event) => updateExercise(exerciseIndex, 'target_weight', event.target.value)} /></label>
                  <label><span>Rest (sec)</span><input type="number" min="0" inputMode="numeric" value={item.rest_seconds} onChange={(event) => updateExercise(exerciseIndex, 'rest_seconds', event.target.value)} /></label>
                </div>
                <label className="notes-field"><span>Notes</span><input value={item.notes} onChange={(event) => updateExercise(exerciseIndex, 'notes', event.target.value)} placeholder="Optional" /></label>
              </details>
            </article>
          ))}

          {selectorOpen ? (
            <div className="selector-panel">
              <ExerciseSelector exercises={exerciseLibrary} excludedIds={day.exercises.map((item) => item.exercise_id)} onSelect={addExercise} />
              <button className="text-button" type="button" onClick={() => setSelectorOpen(false)}>Close selector</button>
            </div>
          ) : (
            <button className="add-block-button" type="button" onClick={() => setSelectorOpen(true)}>+ Add exercise</button>
          )}
        </div>
      )}
    </section>
  )
}

export default ProgramDayCard
