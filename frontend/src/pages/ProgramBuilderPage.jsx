import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getExercises } from '../api/exercises.js'
import { getApiErrors } from '../api/errors.js'
import { createProgram, getProgram, updateProgram } from '../api/programs.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProgramDayCard from '../components/ProgramDayCard.jsx'


const initialProgram = {
  name: '',
  description: '',
  is_active: false,
  days: [],
}

function normalizeProgram(program) {
  return {
    ...program,
    days: program.days.map((day) => ({
      ...day,
      localId: crypto.randomUUID(),
      exercises: day.exercises.map((item) => ({
        ...item,
        localId: crypto.randomUUID(),
        exercise_id: item.exercise.id,
      })),
    })),
  }
}

function ProgramBuilderPage() {
  const { programId } = useParams()
  const editing = Boolean(programId)
  const [program, setProgram] = useState(initialProgram)
  const [exerciseLibrary, setExerciseLibrary] = useState([])
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    async function loadBuilder() {
      setLoading(true)
      try {
        const [exercises, existingProgram] = await Promise.all([
          getExercises(),
          editing ? getProgram(programId) : Promise.resolve(null),
        ])
        if (active) {
          setExerciseLibrary(exercises)
          if (existingProgram) setProgram(normalizeProgram(existingProgram))
        }
      } catch {
        if (active) setError('The program builder could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBuilder()
    return () => { active = false }
  }, [editing, programId])

  function addDay() {
    setProgram((current) => ({
      ...current,
      days: [
        ...current.days,
        {
          localId: crypto.randomUUID(),
          name: '',
          day_of_week: 'flexible',
          order: current.days.length,
          is_rest_day: false,
          exercises: [],
        },
      ],
    }))
  }

  function updateDay(index, nextDay) {
    setProgram((current) => ({
      ...current,
      days: current.days.map((day, currentIndex) => currentIndex === index ? nextDay : day),
    }))
  }

  function removeDay(index) {
    setProgram((current) => ({
      ...current,
      days: current.days
        .filter((_, currentIndex) => currentIndex !== index)
        .map((day, order) => ({ ...day, order })),
    }))
  }

  function moveDay(index, direction) {
    const target = index + direction
    if (target < 0 || target >= program.days.length) return
    setProgram((current) => {
      const days = [...current.days]
      const [moved] = days.splice(index, 1)
      days.splice(target, 0, moved)
      return { ...current, days: days.map((day, order) => ({ ...day, order })) }
    })
  }

  function validateProgram() {
    if (!program.name.trim()) return 'Program name is required.'
    if (program.days.length === 0) return 'Add at least one workout or rest day.'
    for (const day of program.days) {
      if (!day.name.trim()) return 'Every workout day needs a name.'
      if (!day.is_rest_day && day.exercises.length === 0) {
        return `${day.name} needs at least one exercise.`
      }
      for (const item of day.exercises) {
        const minimum = Number(item.target_reps_min)
        const maximum = Number(item.target_reps_max)
        if (Number(item.target_sets) < 1 || minimum < 1 || maximum < minimum) {
          return `Check the sets and rep range for ${item.exercise.name}.`
        }
        if (Number(item.target_weight) < 0 || Number(item.rest_seconds) < 0) {
          return `Weight and rest time cannot be negative for ${item.exercise.name}.`
        }
      }
    }
    return ''
  }

  function toApiPayload() {
    return {
      name: program.name.trim(),
      description: program.description.trim(),
      is_active: program.is_active,
      days: program.days.map((day, dayIndex) => ({
        name: day.name.trim(),
        day_of_week: day.day_of_week,
        order: dayIndex,
        is_rest_day: day.is_rest_day,
        exercises: day.is_rest_day ? [] : day.exercises.map((item, exerciseIndex) => ({
          exercise_id: item.exercise_id,
          order: exerciseIndex,
          target_sets: Number(item.target_sets),
          target_reps_min: Number(item.target_reps_min),
          target_reps_max: Number(item.target_reps_max),
          target_weight: item.target_weight || '0',
          rest_seconds: Number(item.rest_seconds),
          notes: item.notes,
        })),
      })),
    }
  }

  async function saveProgram() {
    const validationError = validateProgram()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    try {
      const savedProgram = editing
        ? await updateProgram(programId, toApiPayload())
        : await createProgram(toApiPayload())
      navigate(`/programs/${savedProgram.id}`, {
        replace: true,
        state: { message: editing ? 'Program updated.' : 'Program created.' },
      })
    } catch (requestError) {
      const errors = getApiErrors(requestError, 'The program could not be saved.')
      setError(errors.form || Object.values(errors).join(' '))
    } finally {
      setSaving(false)
    }
  }

  function nextStep() {
    if (step === 1 && !program.name.trim()) {
      setError('Program name is required.')
      return
    }
    if (step === 2 && (program.days.length === 0 || program.days.some((day) => !day.name.trim()))) {
      setError('Add and name at least one day.')
      return
    }
    setError('')
    setStep((current) => Math.min(4, current + 1))
  }

  if (loading) return <main className="app-page"><LoadingSpinner label="Loading program builder..." /></main>

  return (
    <main className="app-page">
      <PageHeader
        title={editing ? 'Edit program' : 'New program'}
        actions={<Link className="button button-secondary" to={editing ? `/programs/${programId}` : '/programs'}>Cancel</Link>}
      />

      <ErrorMessage message={error} />

      <form className="program-builder" onSubmit={(event) => event.preventDefault()} noValidate>
        <div className="builder-steps" aria-label="Program builder steps">
          {['Program', 'Days', 'Exercises', 'Save'].map((label, index) => <button className={step === index + 1 ? 'active' : ''} type="button" key={label} onClick={() => index + 1 < step && setStep(index + 1)}><span>{index + 1}</span>{label}</button>)}
        </div>

        {step === 1 && <section className="builder-card program-basics">
          <label>
            <span>Program name</span>
            <input value={program.name} onChange={(event) => setProgram((current) => ({ ...current, name: event.target.value }))} placeholder="Push Pull Legs" />
          </label>
          <label>
            <span>Description <small>Optional</small></span>
            <textarea rows="3" value={program.description} onChange={(event) => setProgram((current) => ({ ...current, description: event.target.value }))} />
          </label>
        </section>}

        {step === 2 && <section className="builder-card">
          <div className="builder-section-heading"><h2>Days</h2><button className="button button-secondary button-small" type="button" onClick={addDay}>+ Add Day</button></div>
          {program.days.length === 0 && <button className="add-day-empty" type="button" onClick={addDay}><strong>Add your first day</strong></button>}
          <div className="day-setup-list">
            {program.days.map((day, index) => <article key={day.localId || day.id}>
              <label><span>Day name</span><input value={day.name} onChange={(event) => updateDay(index, { ...day, name: event.target.value })} placeholder="Push" /></label>
              <label><span>Schedule</span><select value={day.day_of_week} onChange={(event) => updateDay(index, { ...day, day_of_week: event.target.value })}>{['flexible', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
              <label className="switch-row"><span>Rest day</span><input type="checkbox" checked={day.is_rest_day} disabled={day.exercises.length > 0} onChange={(event) => updateDay(index, { ...day, is_rest_day: event.target.checked })} /></label>
              <div className="reorder-actions"><button type="button" disabled={index === 0} onClick={() => moveDay(index, -1)}>Up</button><button type="button" disabled={index === program.days.length - 1} onClick={() => moveDay(index, 1)}>Down</button><button className="danger" type="button" onClick={() => removeDay(index)}>Remove</button></div>
            </article>)}
          </div>
        </section>}

        {step === 3 && <div className="program-days-stack">
          {program.days.map((day, index) => (
            <ProgramDayCard
              key={day.localId || day.id}
              day={day}
              index={index}
              totalDays={program.days.length}
              exerciseLibrary={exerciseLibrary}
              onChange={(nextDay) => updateDay(index, nextDay)}
              onMove={moveDay}
              onRemove={removeDay}
            />
          ))}
        </div>}

        {step === 4 && <section className="builder-card builder-review">
          <h2>{program.name}</h2>
          <p>{program.days.length} days</p>
          {program.days.map((day) => <div key={day.localId || day.id}><strong>{day.name}</strong><span>{day.is_rest_day ? 'Rest' : `${day.exercises.length} exercises`}</span></div>)}
          <label className="switch-row">
            <span>Make active</span>
            <input type="checkbox" checked={program.is_active} onChange={(event) => setProgram((current) => ({ ...current, is_active: event.target.checked }))} />
          </label>
        </section>}

        <div className="builder-save-bar">
          {step > 1 ? <button className="button button-secondary" type="button" onClick={() => setStep((current) => current - 1)}>Back</button> : <span />}
          {step < 4 ? <button className="button button-primary" type="button" onClick={nextStep}>Next</button> : <button className="button button-primary" type="button" onClick={saveProgram} disabled={saving}>{saving ? 'Saving...' : 'Save Program'}</button>}
        </div>
      </form>
    </main>
  )
}

export default ProgramBuilderPage
