import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getApiErrors } from '../api/errors.js'
import {
  createMeasurement,
  deleteMeasurement,
  getMeasurements,
  updateMeasurement,
} from '../api/progress.js'
import { getPersonalRecords } from '../api/records.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/useAuth.js'
import { displayWeight, formatWeight } from '../utils/format.js'


const blankMeasurement = {
  date: new Date().toISOString().slice(0, 10),
  body_weight_kg: '',
  body_fat_percentage: '',
  chest_cm: '',
  waist_cm: '',
  hips_cm: '',
  left_arm_cm: '',
  right_arm_cm: '',
  left_thigh_cm: '',
  right_thigh_cm: '',
  notes: '',
}

function ProgressPage() {
  const { user } = useAuth()
  const unit = user.preferred_weight_unit || 'kg'
  const [tab, setTab] = useState('weight')
  const [measurements, setMeasurements] = useState([])
  const [records, setRecords] = useState([])
  const [exercise, setExercise] = useState('')
  const [form, setForm] = useState(blankMeasurement)
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [measurementData, recordData] = await Promise.all([
        getMeasurements(),
        getPersonalRecords(),
      ])
      setMeasurements(measurementData)
      setRecords(recordData)
      setExercise((current) => current || recordData[0]?.exercise_name || '')
    } catch {
      setError('Progress could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!formOpen) return undefined
    function closeOnNativeBack(event) {
      if (saving) return
      event.preventDefault()
      setFormOpen(false)
    }
    window.addEventListener('prime:native-back', closeOnNativeBack)
    return () => window.removeEventListener('prime:native-back', closeOnNativeBack)
  }, [formOpen, saving])

  const weightData = useMemo(() => [...measurements].reverse().map((item) => ({
    date: new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: Number(displayWeight(item.body_weight_kg, unit).toFixed(2)),
  })), [measurements, unit])

  const exerciseNames = useMemo(() => [...new Set(records.map((item) => item.exercise_name))], [records])
  const strengthData = useMemo(() => records
    .filter((item) => item.exercise_name === exercise && item.record_type === 'estimated_1rm')
    .reverse()
    .map((item) => ({
      date: new Date(item.achieved_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Number(displayWeight(item.record_value, unit).toFixed(2)),
    })), [exercise, records, unit])

  function openCreate() {
    setEditing(null)
    setForm(blankMeasurement)
    setFormErrors({})
    setFormOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm(Object.fromEntries(Object.keys(blankMeasurement).map((key) => [key, item[key] ?? ''])))
    setFormErrors({})
    setFormOpen(true)
  }

  function change(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === '' ? null : value]))
    payload.notes ||= ''
    try {
      if (editing) await updateMeasurement(editing.id, payload)
      else await createMeasurement(payload)
      setFormOpen(false)
      await load()
    } catch (requestError) {
      setFormErrors(getApiErrors(requestError, 'Measurement could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteMeasurement(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch {
      setError('Measurement could not be deleted.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="app-page"><LoadingSpinner label="Loading progress..." /></main>

  const current = measurements[0]
  const previous = measurements[1]
  const changeValue = current && previous
    ? Number(current.body_weight_kg) - Number(previous.body_weight_kg)
    : null

  return (
    <main className="app-page progress-page">
      <PageHeader title="Progress" actions={<button className="button button-primary button-small" type="button" onClick={openCreate}>+ Add</button>} />
      <div className="tabs" role="tablist">
        {['weight', 'strength', 'measurements'].map((item) => <button className={tab === item ? 'active' : ''} type="button" role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
      </div>
      <ErrorMessage message={error} onRetry={load} />

      {tab === 'weight' && (
        <section className="progress-panel">
          {weightData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={weightData}><CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="date" stroke="#7f8781" tickLine={false} axisLine={false} /><YAxis stroke="#7f8781" tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} /><Tooltip contentStyle={{ background: '#151916', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10 }} /><Line type="monotone" dataKey="value" stroke="#c1ff3d" strokeWidth={3} dot={{ fill: '#c1ff3d', r: 4 }} /></LineChart></ResponsiveContainer></div> : <EmptyState title="No measurements yet." message="Add your first entry." />}
          {current && <div className="progress-summary"><div><span>Current</span><strong>{formatWeight(current.body_weight_kg, unit)}</strong></div><div><span>Change</span><strong>{changeValue == null ? '—' : `${changeValue > 0 ? '+' : ''}${displayWeight(changeValue, unit).toFixed(1)} ${unit}`}</strong></div></div>}
        </section>
      )}

      {tab === 'strength' && (
        <section className="progress-panel">
          {exerciseNames.length ? <><label className="chart-select"><span>Exercise</span><select value={exercise} onChange={(event) => setExercise(event.target.value)}>{exerciseNames.map((name) => <option key={name}>{name}</option>)}</select></label>{strengthData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={strengthData}><CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="date" stroke="#7f8781" tickLine={false} axisLine={false} /><YAxis stroke="#7f8781" tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} /><Tooltip contentStyle={{ background: '#151916', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10 }} /><Line type="monotone" dataKey="value" stroke="#c1ff3d" strokeWidth={3} /></LineChart></ResponsiveContainer></div> : <EmptyState title="No strength trend yet." message="Repeat an exercise to build a trend." />}</> : <EmptyState title="No strength records yet." message="Finish a weighted workout." />}
        </section>
      )}

      {tab === 'measurements' && (
        <section className="measurement-list">
          {measurements.length === 0 ? <EmptyState title="No measurements yet." message="Add your first entry." /> : measurements.map((item) => (
            <article key={item.id}><div><strong>{new Date(`${item.date}T00:00:00`).toLocaleDateString()}</strong><span>{formatWeight(item.body_weight_kg, unit)}{item.body_fat_percentage ? ` · ${item.body_fat_percentage}% body fat` : ''}</span></div><div><button className="text-button" type="button" onClick={() => openEdit(item)}>Edit</button><button className="text-button danger" type="button" onClick={() => setDeleteTarget(item)}>Delete</button></div></article>
          ))}
        </section>
      )}

      {formOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && setFormOpen(false)}><section className="form-modal compact-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><h2>{editing ? 'Edit measurement' : 'Add measurement'}</h2>{formErrors.form && <p className="status-banner error">{formErrors.form}</p>}<form className="simple-form" onSubmit={save}><div className="form-grid-two"><label><span>Date</span><input name="date" type="date" value={form.date} onChange={change} />{formErrors.date && <small className="field-error">{formErrors.date}</small>}</label><label><span>Weight (kg)</span><input name="body_weight_kg" type="number" min="20" max="500" step="0.1" required value={form.body_weight_kg} onChange={change} />{formErrors.body_weight_kg && <small className="field-error">{formErrors.body_weight_kg}</small>}</label></div><details><summary>More measurements</summary><div className="measurement-fields">{[['body_fat_percentage', 'Body fat %'], ['chest_cm', 'Chest cm'], ['waist_cm', 'Waist cm'], ['hips_cm', 'Hips cm'], ['left_arm_cm', 'Left arm cm'], ['right_arm_cm', 'Right arm cm'], ['left_thigh_cm', 'Left thigh cm'], ['right_thigh_cm', 'Right thigh cm']].map(([name, label]) => <label key={name}><span>{label}</span><input name={name} type="number" min="0" step="0.1" value={form[name]} onChange={change} />{formErrors[name] && <small className="field-error">{formErrors[name]}</small>}</label>)}</div></details><label><span>Notes</span><textarea name="notes" rows="3" value={form.notes} onChange={change} /></label><div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div></form></section></div>}
      <ConfirmModal open={Boolean(deleteTarget)} title="Delete measurement?" message="This entry will be removed." confirmLabel="Delete" danger busy={saving} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
    </main>
  )
}

export default ProgressPage
