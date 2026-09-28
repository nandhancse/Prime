import { useState } from 'react'
import { getApiErrors } from '../api/errors.js'
import { updateProfile } from '../api/profile.js'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/useAuth.js'


function SettingsPage() {
  const { user, updateUser, logout } = useAuth()
  const [form, setForm] = useState({
    default_rest_seconds: user.default_rest_seconds ?? 90,
    preferred_weight_unit: user.preferred_weight_unit || 'kg',
    compact_workout_layout: Boolean(user.compact_workout_layout),
    confirm_before_incomplete_workout: user.confirm_before_incomplete_workout ?? true,
    confirm_before_cancel_workout: user.confirm_before_cancel_workout ?? true,
  })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function change(event) {
    const { name, type, checked, value } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setMessage('')
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const profile = await updateProfile(form)
      updateUser(profile)
      setMessage('Settings saved.')
    } catch (error) {
      setMessage(getApiErrors(error, 'Settings could not be saved.').form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="app-page narrow-page">
      <PageHeader title="Settings" />
      {message && <p className={`status-banner ${message === 'Settings saved.' ? 'success' : 'error'}`}>{message}</p>}
      <form className="settings-form" onSubmit={submit}>
        <section>
          <h2>Workout</h2>
          <label><span>Default rest timer</span><div className="inline-control"><input name="default_rest_seconds" type="number" min="0" max="3600" value={form.default_rest_seconds} onChange={change} /><span>sec</span></div></label>
          <label><span>Weight unit</span><select name="preferred_weight_unit" value={form.preferred_weight_unit} onChange={change}><option value="kg">Kilograms</option><option value="lb">Pounds</option></select></label>
        </section>
        <section>
          <h2>Preferences</h2>
          <label className="switch-row"><span>Compact workout view</span><input name="compact_workout_layout" type="checkbox" checked={form.compact_workout_layout} onChange={change} /></label>
          <label className="switch-row"><span>Confirm before finish</span><input name="confirm_before_incomplete_workout" type="checkbox" checked={form.confirm_before_incomplete_workout} onChange={change} /></label>
          <label className="switch-row"><span>Confirm before cancel</span><input name="confirm_before_cancel_workout" type="checkbox" checked={form.confirm_before_cancel_workout} onChange={change} /></label>
        </section>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
      </form>
      <section className="settings-account"><h2>Account</h2><button className="button button-secondary" type="button" onClick={logout}>Logout</button></section>
    </main>
  )
}

export default SettingsPage
