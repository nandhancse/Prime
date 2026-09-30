import { ArrowLeft, ArrowRight, Check, Plus } from 'lucide-react'
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

const steps = [
  {
    label: 'Basics',
    title: 'Name your program',
    description: 'Give the plan a clear name and a short note so it is easy to recognize later.',
  },
  {
    label: 'Schedule',
    title: 'Plan your training week',
    description: 'Add your workout days, choose when they happen, and include rest days if you want them visible.',
  },
  {
    label: 'Exercises',
    title: 'Build each workout',
    description: 'Choose the exercises for every training day, then set your targets. You can fine-tune weight and rest time later.',
  },
  {
    label: 'Review',
    title: 'Review and finish',
    description: 'Check the structure once, choose whether to make it active, and save when it looks right.',
  },
]

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
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const navigate = useNavigate()
  const currentStep = steps[step - 1]

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
      setError('Give your program a name before continuing.')
      return
    }
    if (step === 2 && (program.days.length === 0 || program.days.some((day) => !day.name.trim()))) {
      setError('Add and name at least one day before continuing.')
      return
    }
    if (step === 3) {
      const validationError = validateProgram()
      if (validationError) {
        setError(validationError)
        return
      }
    }
    setError('')
    setStep((current) => Math.min(4, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function previousStep() {
    setError('')
    setStep((current) => Math.max(1, current - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBackToStep(targetStep) {
    if (targetStep >= step) return
    setError('')
    setStep(targetStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <main className="app-page"><LoadingSpinner label="Loading program builder..." /></main>

  return (
    <main className="app-page builder-page">
      <PageHeader
        eyebrow={editing ? 'Program editor' : 'Program setup'}
        title={editing ? 'Edit program' : 'Build your program'}
        description={editing ? 'Make changes without losing the structure you already built.' : 'A short guided setup. You can change everything later.'}
        actions={<Link className="button button-secondary button-small" to={editing ? `/programs/${programId}` : '/programs'}>Cancel</Link>}
      />

      <ErrorMessage message={error} />

      <form className="program-builder" onSubmit={(event) => event.preventDefault()} noValidate>
        <nav className="builder-progress" aria-label="Program builder progress">
          <div className="builder-progress-copy">
            <span>Step {step} of {steps.length}</span>
            <strong>{currentStep.label}</strong>
          </div>
          <div className="builder-progress-track">
            {steps.map((item, index) => {
              const number = index + 1
              const state = number === step ? 'current' : number < step ? 'complete' : ''
              return (
                <button
                  aria-current={number === step ? 'step' : undefined}
                  aria-label={`Step ${number}: ${item.label}`}
                  className={state}
                  disabled={number > step}
                  key={item.label}
                  onClick={() => goBackToStep(number)}
                  type="button"
                >
                  {number < step ? <Check size={14} strokeWidth={2.6} /> : number}
                </button>
              )
            })}
          </div>
        </nav>

        <section className="builder-stage" aria-labelledby="builder-stage-title">
          <header className="builder-stage-header">
            <span>{currentStep.label}</span>
            <h2 id="builder-stage-title">{currentStep.title}</h2>
            <p>{currentStep.description}</p>
          </header>

          {step === 1 && (
            <div className="builder-card program-basics">
              <label>
                <span>Program name</span>
                <input
                  autoFocus
                  value={program.name}
                  onChange={(event) => setProgram((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Upper / Lower 4 Day"
                />
              </label>
              <label>
                <span>Description <small>Optional</small></span>
                <textarea
                  rows="3"
                  value={program.description}
                  onChange={(event) => setProgram((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Strength-focused plan for the next 8 weeks"
                />
              </label>
              <div className="builder-tip">
                <strong>Keep it obvious.</strong>
                <span>Use a name you will recognize instantly when you are at the gym.</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="builder-card">
              <div className="builder-section-heading">
                <div>
                  <h3>Your week</h3>
                  <p>{program.days.length ? `${program.days.length} day${program.days.length === 1 ? '' : 's'} added` : 'Nothing added yet'}</p>
                </div>
                <button className="button button-secondary button-small" type="button" onClick={addDay}>
                  <Plus size={17} /> Add day
                </button>
              </div>

              {program.days.length === 0 && (
                <button className="add-day-empty" type="button" onClick={addDay}>
                  <Plus size={22} />
                  <strong>Add your first workout day</strong>
                  <span>Give it a name like Push, Pull, Legs, Upper, or Full Body.</span>
                </button>
              )}

              <div className="day-setup-list">
                {program.days.map((day, index) => (
                  <article key={day.localId || day.id}>
                    <div className="day-card-top">
                      <span className="day-number">{index + 1}</span>
                      <div>
                        <strong>{day.name || 'Untitled day'}</strong>
                        <small>{day.is_rest_day ? 'Rest day' : 'Workout day'}</small>
                      </div>
                    </div>
                    <label>
                      <span>Day name</span>
                      <input
                        value={day.name}
                        onChange={(event) => updateDay(index, { ...day, name: event.target.value })}
                        placeholder="Push"
                      />
                    </label>
                    <label>
                      <span>Schedule</span>
                      <select
                        value={day.day_of_week}
                        onChange={(event) => updateDay(index, { ...day, day_of_week: event.target.value })}
                      >
                        {['flexible', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((value) => (
                          <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="switch-row compact-switch">
                      <span>
                        <strong>Rest day</strong>
                        <small>No exercises will be added to this day.</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={day.is_rest_day}
                        disabled={day.exercises.length > 0}
                        onChange={(event) => updateDay(index, { ...day, is_rest_day: event.target.checked })}
                      />
                    </label>
                    <div className="reorder-actions">
                      <button type="button" disabled={index === 0} onClick={() => moveDay(index, -1)}>Move up</button>
                      <button type="button" disabled={index === program.days.length - 1} onClick={() => moveDay(index, 1)}>Move down</button>
                      <button className="danger" type="button" onClick={() => removeDay(index)}>Remove</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="program-exercise-step">
              <div className="workout-day-tabs" role="tablist" aria-label="Workout days">
                {program.days.map((day, index) => (
                  <button
                    className={activeDayIndex === index ? 'active' : ''}
                    type="button"
                    role="tab"
                    aria-selected={activeDayIndex === index}
                    key={day.localId || day.id}
                    onClick={() => setActiveDayIndex(index)}
                  >
                    <span>{day.name || `Day ${index + 1}`}</span>
                    <small>{day.is_rest_day ? 'Rest' : `${day.exercises.length} exercises`}</small>
                  </button>
                ))}
              </div>

              {program.days[activeDayIndex] && (
                <ProgramDayCard
                  key={program.days[activeDayIndex].localId || program.days[activeDayIndex].id}
                  day={program.days[activeDayIndex]}
                  index={activeDayIndex}
                  totalDays={program.days.length}
                  exerciseLibrary={exerciseLibrary}
                  onChange={(nextDay) => updateDay(activeDayIndex, nextDay)}
                  onMove={moveDay}
                  onRemove={removeDay}
                />
              )}

              <div className="day-step-navigation">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={activeDayIndex === 0}
                  onClick={() => setActiveDayIndex((current) => current - 1)}
                >
                  Previous day
                </button>
                <span>{activeDayIndex + 1} / {program.days.length}</span>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={activeDayIndex === program.days.length - 1}
                  onClick={() => setActiveDayIndex((current) => current + 1)}
                >
                  Next day
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="builder-card builder-review">
              <div className="review-program-heading">
                <div>
                  <span>Program</span>
                  <h3>{program.name}</h3>
                  {program.description && <p>{program.description}</p>}
                </div>
                <strong>{program.days.filter((day) => !day.is_rest_day).length} workouts</strong>
              </div>

              <div className="review-days">
                {program.days.map((day) => (
                  <div key={day.localId || day.id}>
                    <div>
                      <strong>{day.name}</strong>
                      <span>{day.day_of_week === 'flexible' ? 'Flexible' : day.day_of_week}</span>
                    </div>
                    <span>{day.is_rest_day ? 'Rest' : `${day.exercises.length} exercises`}</span>
                  </div>
                ))}
              </div>

              <label className="switch-row review-active-switch">
                <span>
                  <strong>Make this my active program</strong>
                  <small>PRime will use it on Home and Workout.</small>
                </span>
                <input
                  type="checkbox"
                  checked={program.is_active}
                  onChange={(event) => setProgram((current) => ({ ...current, is_active: event.target.checked }))}
                />
              </label>
            </div>
          )}
        </section>

        <div className="builder-save-bar">
          {step > 1 ? (
            <button className="button button-secondary" type="button" onClick={previousStep}>
              <ArrowLeft size={18} /> Back
            </button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <button className="button button-primary" type="button" onClick={nextStep}>
              Continue <ArrowRight size={18} />
            </button>
          ) : (
            <button className="button button-primary" type="button" onClick={saveProgram} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Create program'}
            </button>
          )}
        </div>
      </form>
    </main>
  )
}

export default ProgramBuilderPage
