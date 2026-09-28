import { useState } from 'react'
import { getApiErrors } from '../api/errors.js'
import { updateProfile } from '../api/profile.js'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/useAuth.js'


function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    display_name: user.display_name || '',
    height_cm: user.height_cm || '',
    current_weight_kg: user.current_weight_kg || '',
    primary_fitness_goal: user.primary_fitness_goal || 'general_fitness',
    training_experience: user.training_experience || 'beginner',
    weekly_workout_target: user.weekly_workout_target || 3,
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function change(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '', form: '' }))
    setSaved(false)
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const profile = await updateProfile(form)
      updateUser(profile)
      setSaved(true)
    } catch (error) {
      setErrors(getApiErrors(error, 'Profile could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="app-page narrow-page">
      <PageHeader title="Profile" />
      {saved && <p className="status-banner success">Profile saved.</p>}
      {errors.form && <p className="status-banner error">{errors.form}</p>}
      <form className="simple-form" onSubmit={submit}>
        <label><span>Username</span><input value={user.username} disabled /></label>
        <label><span>Display name</span><input name="display_name" value={form.display_name} onChange={change} /></label>
        <div className="form-grid-two">
          <label><span>Height (cm)</span><input name="height_cm" type="number" min="80" max="250" step="0.1" value={form.height_cm} onChange={change} />{errors.height_cm && <small className="field-error">{errors.height_cm}</small>}</label>
          <label><span>Weight (kg)</span><input name="current_weight_kg" type="number" min="20" max="500" step="0.1" value={form.current_weight_kg} onChange={change} />{errors.current_weight_kg && <small className="field-error">{errors.current_weight_kg}</small>}</label>
        </div>
        <label><span>Goal</span><select name="primary_fitness_goal" value={form.primary_fitness_goal} onChange={change}><option value="muscle_gain">Muscle gain</option><option value="strength">Strength</option><option value="fat_loss">Fat loss</option><option value="general_fitness">General fitness</option></select></label>
        <label><span>Experience</span><select name="training_experience" value={form.training_experience} onChange={change}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
        <label><span>Weekly target</span><input name="weekly_workout_target" type="number" min="1" max="14" value={form.weekly_workout_target} onChange={change} />{errors.weekly_workout_target && <small className="field-error">{errors.weekly_workout_target}</small>}</label>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
      </form>
    </main>
  )
}

export default ProfilePage
