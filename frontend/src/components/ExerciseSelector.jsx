import { useMemo, useState } from 'react'


function ExerciseSelector({ exercises, excludedIds = [], onSelect }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(
    () => exercises.filter((exercise) => (
      !excludedIds.includes(exercise.id)
      && exercise.name.toLowerCase().includes(search.trim().toLowerCase())
    )),
    [excludedIds, exercises, search],
  )

  return (
    <div className="exercise-selector">
      <label>
        <span>Search the exercise library</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type an exercise name" />
      </label>
      <div className="selector-results">
        {filtered.slice(0, 12).map((exercise) => (
          <button key={exercise.id} type="button" onClick={() => onSelect(exercise)}>
            <strong>{exercise.name}</strong>
            <span>{exercise.primary_muscle.name} · {exercise.equipment.name}</span>
          </button>
        ))}
        {filtered.length === 0 && <p>No matching exercises available.</p>}
      </div>
    </div>
  )
}

export default ExerciseSelector
