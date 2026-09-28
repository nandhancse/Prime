import { useCallback, useEffect, useState } from 'react'
import {
  createExercise,
  deleteExercise,
  getEquipment,
  getExercises,
  getMuscleGroups,
  updateExercise,
} from '../api/exercises.js'
import { getApiErrors } from '../api/errors.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PageHeader from '../components/PageHeader.jsx'


const emptyForm = {
  name: '',
  primary_muscle_id: '',
  secondary_muscle_ids: [],
  equipment_id: '',
  instructions: '',
}

function ExercisesPage() {
  const [exercises, setExercises] = useState([])
  const [muscleGroups, setMuscleGroups] = useState([])
  const [equipment, setEquipment] = useState([])
  const [filters, setFilters] = useState({ search: '', primary_muscle: '', equipment: '', custom: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [message, setMessage] = useState('')

  const loadMetadata = useCallback(async () => {
    try {
      const [muscles, equipmentItems] = await Promise.all([
        getMuscleGroups(),
        getEquipment(),
      ])
      setMuscleGroups(muscles)
      setEquipment(equipmentItems)
    } catch {
      setError('The exercise filters could not be loaded.')
    }
  }, [])

  const loadExercises = useCallback(async (activeFilters = filters) => {
    setLoading(true)
    setError('')
    try {
      const data = await getExercises(activeFilters)
      setExercises(data)
    } catch {
      setError('The exercise library could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadMetadata()
  }, [loadMetadata])

  useEffect(() => {
    const timeout = window.setTimeout(() => loadExercises(filters), 250)
    return () => window.clearTimeout(timeout)
  }, [filters, loadExercises])

  useEffect(() => {
    if (!formOpen) return undefined
    function closeOnNativeBack(event) {
      if (submitting) return
      event.preventDefault()
      setFormOpen(false)
    }
    window.addEventListener('prime:native-back', closeOnNativeBack)
    return () => window.removeEventListener('prime:native-back', closeOnNativeBack)
  }, [formOpen, submitting])

  function updateFilter(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function openCreateForm() {
    setEditingExercise(null)
    setFormData(emptyForm)
    setFormErrors({})
    setFormOpen(true)
  }

  function openEditForm(exercise) {
    setEditingExercise(exercise)
    setFormData({
      name: exercise.name,
      primary_muscle_id: String(exercise.primary_muscle.id),
      secondary_muscle_ids: exercise.secondary_muscles.map((muscle) => muscle.id),
      equipment_id: String(exercise.equipment.id),
      instructions: exercise.instructions,
    })
    setFormErrors({})
    setFormOpen(true)
  }

  function updateForm(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setFormErrors((current) => ({ ...current, [name]: '', form: '' }))
  }

  function toggleSecondaryMuscle(id) {
    setFormData((current) => ({
      ...current,
      secondary_muscle_ids: current.secondary_muscle_ids.includes(id)
        ? current.secondary_muscle_ids.filter((item) => item !== id)
        : [...current.secondary_muscle_ids, id],
    }))
  }

  async function submitExercise(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!formData.name.trim()) nextErrors.name = 'Exercise name is required.'
    if (!formData.primary_muscle_id) nextErrors.primary_muscle_id = 'Choose a primary muscle.'
    if (!formData.equipment_id) nextErrors.equipment_id = 'Choose equipment.'
    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors)
      return
    }

    setSubmitting(true)
    setFormErrors({})
    try {
      if (editingExercise) {
        await updateExercise(editingExercise.id, formData)
        setMessage('Custom exercise updated.')
      } else {
        await createExercise(formData)
        setMessage('Custom exercise created.')
      }
      setFormOpen(false)
      await loadExercises(filters)
    } catch (requestError) {
      setFormErrors(getApiErrors(requestError, 'The exercise could not be saved.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteExercise(deleteTarget.id)
      setDeleteTarget(null)
      setMessage('Custom exercise deleted.')
      await loadExercises(filters)
    } catch (requestError) {
      setDeleteTarget(null)
      setError(getApiErrors(requestError, 'The exercise could not be deleted.').form)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="app-page">
      <PageHeader
        title="Exercises"
        actions={(
          <button className="button button-primary" type="button" onClick={openCreateForm}>
            + Custom
          </button>
        )}
      />

      {message && <p className="status-banner success" role="status">{message}</p>}

      <label className="standalone-search search-field">
          <span>Search</span>
          <input name="search" value={filters.search} onChange={updateFilter} placeholder="Search exercises" />
      </label>
      <details className="filter-panel">
        <summary>Filters</summary>
        <section className="filter-bar" aria-label="Exercise filters">
          <label>
          <span>Primary muscle</span>
          <select name="primary_muscle" value={filters.primary_muscle} onChange={updateFilter}>
            <option value="">All muscles</option>
            {muscleGroups.map((muscle) => <option key={muscle.id} value={muscle.id}>{muscle.name}</option>)}
          </select>
        </label>
        <label>
          <span>Equipment</span>
          <select name="equipment" value={filters.equipment} onChange={updateFilter}>
            <option value="">All equipment</option>
            {equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>
          <span>Library</span>
          <select name="custom" value={filters.custom} onChange={updateFilter}>
            <option value="">System and custom</option>
            <option value="false">System only</option>
            <option value="true">My custom exercises</option>
          </select>
          </label>
        </section>
      </details>

      <ErrorMessage message={error} onRetry={() => loadExercises(filters)} />
      {loading ? (
        <LoadingSpinner label="Loading exercise library..." />
      ) : exercises.length === 0 ? (
        <EmptyState title="No exercises found." message="Clear a filter or add one.">
          <button className="button button-primary" type="button" onClick={openCreateForm}>Create exercise</button>
        </EmptyState>
      ) : (
        <section className="exercise-grid" aria-label="Exercises">
          {exercises.map((exercise) => (
            <article className="exercise-card" key={exercise.id}>
              <div className="exercise-card-topline">
                <span>{exercise.primary_muscle.name}</span>
                {exercise.is_custom && <span className="badge custom">Custom</span>}
              </div>
              <h2>{exercise.name}</h2>
              <p>{exercise.equipment.name}</p>
              {exercise.is_custom && (
                <div className="card-actions">
                  <button className="text-button" type="button" onClick={() => openEditForm(exercise)}>Edit</button>
                  <button className="text-button danger" type="button" onClick={() => setDeleteTarget(exercise)}>Delete</button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {formOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !submitting && setFormOpen(false)}>
          <section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="exercise-form-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="page-eyebrow">Custom movement</p>
                <h2 id="exercise-form-title">{editingExercise ? 'Edit exercise' : 'Create exercise'}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close form" onClick={() => setFormOpen(false)}>×</button>
            </div>
            {formErrors.form && <p className="status-banner error" role="alert">{formErrors.form}</p>}
            <form className="stack-form" onSubmit={submitExercise} noValidate>
              <label>
                <span>Name</span>
                <input name="name" value={formData.name} onChange={updateForm} />
                {formErrors.name && <small className="field-error">{formErrors.name}</small>}
              </label>
              <div className="form-grid-two">
                <label>
                  <span>Primary muscle</span>
                  <select name="primary_muscle_id" value={formData.primary_muscle_id} onChange={updateForm}>
                    <option value="">Choose muscle</option>
                    {muscleGroups.map((muscle) => <option key={muscle.id} value={muscle.id}>{muscle.name}</option>)}
                  </select>
                  {formErrors.primary_muscle_id && <small className="field-error">{formErrors.primary_muscle_id}</small>}
                </label>
                <label>
                  <span>Equipment</span>
                  <select name="equipment_id" value={formData.equipment_id} onChange={updateForm}>
                    <option value="">Choose equipment</option>
                    {equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  {formErrors.equipment_id && <small className="field-error">{formErrors.equipment_id}</small>}
                </label>
              </div>
              <fieldset className="checkbox-fieldset">
                <legend>Secondary muscles</legend>
                <div>
                  {muscleGroups.filter((muscle) => String(muscle.id) !== String(formData.primary_muscle_id)).map((muscle) => (
                    <label key={muscle.id}>
                      <input type="checkbox" checked={formData.secondary_muscle_ids.includes(muscle.id)} onChange={() => toggleSecondaryMuscle(muscle.id)} />
                      <span>{muscle.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                <span>Instructions</span>
                <textarea name="instructions" rows="4" value={formData.instructions} onChange={updateForm} />
              </label>
              <div className="modal-actions">
                <button className="button button-secondary" type="button" onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</button>
                <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save exercise'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete custom exercise?"
        message={`Delete ${deleteTarget?.name || 'this exercise'}? This cannot be undone.`}
        confirmLabel="Delete exercise"
        danger
        busy={submitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  )
}

export default ExercisesPage
