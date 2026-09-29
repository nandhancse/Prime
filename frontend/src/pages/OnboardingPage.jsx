import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getApiErrors } from '../api/errors.js'
import { updateProfile } from '../api/profile.js'
import { useAuth } from '../context/useAuth.js'


const steps = [
  { label: 'About you', title: 'A few basics', description: 'This helps PRime make the app feel personal and keep your progress meaningful.' },
  { label: 'Goal', title: 'What are you training for?', description: 'Pick the goal that matters most right now. You can change it later.' },
  { label: 'Training', title: 'How do you train now?', description: 'Tell PRime your current split and how often you normally train.' },
  { label: 'Review', title: 'You’re ready', description: 'Check the essentials once. Nothing here is permanent.' },
]

const splitOptions = [
  ['none', 'No current split', 'I want to build one in PRime'],
  ['push_pull_legs', 'Push / Pull / Legs', 'Push, pull and leg-focused sessions'],
  ['upper_lower', 'Upper / Lower', 'Alternating upper and lower body days'],
  ['full_body', 'Full Body', 'Whole-body sessions'],
  ['bro_split', 'Body-part split', 'Chest, back, arms, shoulders, legs, etc.'],
  ['custom', 'Custom', 'I use another structure'],
]

const goalOptions = [
  ['muscle_gain', 'Build muscle'],
  ['strength', 'Get stronger'],
  ['fat_loss', 'Lose fat'],
  ['general_fitness', 'General fitness'],
]

function OnboardingPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    display_name: user?.display_name || '',
    height_cm: user?.height_cm || '',
    current_weight_kg: user?.current_weight_kg || '',
    training_experience: user?.training_experience || 'beginner',
    primary_fitness_goal: user?.primary_fitness_goal || 'general_fitness',
    weekly_workout_target: user?.weekly_workout_target || 3,
    current_training_split: user?.current_training_split || 'none',
    custom_training_split: user?.custom_training_split || '',
    preferred_weight_unit: user?.preferred_weight_unit || 'kg',
  })

  const selectedSplit = useMemo(
    () => splitOptions.find(([value]) => value === form.current_training_split),
    [form.current_training_split],
  )

  if (user?.onboarding_completed) return <Navigate to="/dashboard" replace />

  function change(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '', form: '' }))
  }

  function choose(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '', form: '' }))
  }

  function validateCurrentStep() {
    const next = {}
    if (step === 1) {
      if (!form.display_name.trim()) next.display_name = 'Enter the name you want PRime to use.'
      if (!form.height_cm) next.height_cm = 'Enter your height.'
      if (!form.current_weight_kg) next.current_weight_kg = 'Enter your current weight.'
    }
    if (step === 3 && form.current_training_split === 'custom' && !form.custom_training_split.trim()) {
      next.custom_training_split = 'Tell us what your current split is called.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function next() {
    if (!validateCurrentStep()) return
    setStep((current) => Math.min(4, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function back() {
    setErrors({})
    setStep((current) => Math.max(1, current - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function finish() {
    if (!validateCurrentStep()) return
    setSaving(true)
    setErrors({})
    try {
      const profile = await updateProfile({
        ...form,
        display_name: form.display_name.trim(),
        height_cm: Number(form.height_cm),
        current_weight_kg: Number(form.current_weight_kg),
        weekly_workout_target: Number(form.weekly_workout_target),
        custom_training_split: form.custom_training_split.trim(),
        onboarding_completed: true,
      })
      updateUser(profile)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const parsed = getApiErrors(error, 'Setup could not be saved. Please try again.')
      setErrors(parsed)
      if (parsed.display_name || parsed.height_cm || parsed.current_weight_kg) setStep(1)
      else if (parsed.custom_training_split) setStep(3)
    } finally {
      setSaving(false)
    }
  }

  const current = steps[step - 1]

  return (
    <main className="onboarding-page">
      <section className="onboarding-shell">
        <header className="onboarding-brand-row">
          <div className="onboarding-brand"><span>P</span><strong>PRime</strong></div>
          <span className="onboarding-step-count">Step {step} of {steps.length}</span>
        </header>

        <div className="onboarding-progress" aria-label="Setup progress">
          {steps.map((item, index) => {
            const number = index + 1
            return <span className={number <= step ? 'active' : ''} key={item.label} />
          })}
        </div>

        <div className="onboarding-heading">
          <p>{current.label}</p>
          <h1>{current.title}</h1>
          <span>{current.description}</span>
        </div>

        {errors.form && <p className="status-banner error">{errors.form}</p>}

        <section className="onboarding-content">
          {step === 1 && (
            <div className="onboarding-form">
              <label>
                <span>Name</span>
                <input name="display_name" value={form.display_name} onChange={change} placeholder="What should we call you?" autoFocus />
                {errors.display_name && <small className="field-error">{errors.display_name}</small>}
              </label>
              <div className="onboarding-two-column">
                <label>
                  <span>Height (cm)</span>
                  <input name="height_cm" type="number" inputMode="decimal" min="80" max="250" step="0.1" value={form.height_cm} onChange={change} placeholder="172" />
                  {errors.height_cm && <small className="field-error">{errors.height_cm}</small>}
                </label>
                <label>
                  <span>Weight (kg)</span>
                  <input name="current_weight_kg" type="number" inputMode="decimal" min="20" max="500" step="0.1" value={form.current_weight_kg} onChange={change} placeholder="54" />
                  {errors.current_weight_kg && <small className="field-error">{errors.current_weight_kg}</small>}
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-choice-stack">
              <div className="onboarding-choice-grid">
                {goalOptions.map(([value, label]) => (
                  <button className={form.primary_fitness_goal === value ? 'selected' : ''} type="button" key={value} onClick={() => choose('primary_fitness_goal', value)}>
                    <span>{label}</span>
                    {form.primary_fitness_goal === value && <Check size={18} />}
                  </button>
                ))}
              </div>
              <label className="onboarding-select">
                <span>Training experience</span>
                <select name="training_experience" value={form.training_experience} onChange={change}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-choice-stack">
              <div className="split-choice-list">
                {splitOptions.map(([value, label, detail]) => (
                  <button className={form.current_training_split === value ? 'selected' : ''} type="button" key={value} onClick={() => choose('current_training_split', value)}>
                    <div><strong>{label}</strong><span>{detail}</span></div>
                    <span className="choice-check">{form.current_training_split === value ? <Check size={16} /> : ''}</span>
                  </button>
                ))}
              </div>
              {form.current_training_split === 'custom' && (
                <label>
                  <span>Your split</span>
                  <input name="custom_training_split" value={form.custom_training_split} onChange={change} placeholder="e.g. Arnold split" autoFocus />
                  {errors.custom_training_split && <small className="field-error">{errors.custom_training_split}</small>}
                </label>
              )}
              <label className="onboarding-select">
                <span>Workouts per week</span>
                <select name="weekly_workout_target" value={form.weekly_workout_target} onChange={change}>
                  {[2,3,4,5,6,7].map((value) => <option key={value} value={value}>{value} workouts</option>)}
                </select>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding-review">
              <div><span>Name</span><strong>{form.display_name}</strong></div>
              <div><span>Goal</span><strong>{goalOptions.find(([value]) => value === form.primary_fitness_goal)?.[1]}</strong></div>
              <div><span>Experience</span><strong>{form.training_experience[0].toUpperCase() + form.training_experience.slice(1)}</strong></div>
              <div><span>Current split</span><strong>{form.current_training_split === 'custom' ? form.custom_training_split : selectedSplit?.[1]}</strong></div>
              <div><span>Weekly target</span><strong>{form.weekly_workout_target} workouts</strong></div>
              <p>PRime will use this as your starting profile. Your program itself stays fully under your control.</p>
            </div>
          )}
        </section>

        <footer className="onboarding-actions">
          {step > 1 ? <button className="button button-secondary" type="button" onClick={back}><ChevronLeft size={18} /> Back</button> : <span />}
          {step < 4
            ? <button className="button button-primary" type="button" onClick={next}>Continue <ChevronRight size={18} /></button>
            : <button className="button button-primary" type="button" onClick={finish} disabled={saving}>{saving ? 'Saving...' : 'Finish setup'}</button>}
        </footer>
      </section>
    </main>
  )
}

export default OnboardingPage
