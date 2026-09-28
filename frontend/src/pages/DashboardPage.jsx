import { Flame, Scale, Trophy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboardAnalytics } from '../api/analytics.js'
import { startWorkout } from '../api/workouts.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useAuth } from '../context/useAuth.js'
import { formatDate, formatDuration, formatWeight } from '../utils/format.js'


function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getDashboardAnalytics())
    } catch {
      setError('Home could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const nextDay = useMemo(() => {
    const days = data?.active_program?.days?.filter((day) => !day.is_rest_day) || []
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    return days.find((day) => day.day_of_week === today) || days[0] || null
  }, [data])

  async function start() {
    if (data?.active_workout) {
      navigate(`/workout/${data.active_workout.id}`)
      return
    }
    if (!nextDay) {
      navigate(data?.active_program ? '/programs' : '/programs/new')
      return
    }
    setStarting(true)
    try {
      const workout = await startWorkout(nextDay.id)
      navigate(`/workout/${workout.id}`)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Workout could not be started.')
      setStarting(false)
    }
  }

  if (loading) return <main className="app-page home-page"><LoadingSpinner label="Loading..." /></main>

  const summary = data?.user_summary
  const recent = data?.recent_workouts?.[0]
  const unit = summary?.preferred_weight_unit || user.preferred_weight_unit || 'kg'
  const weeklyTarget = summary?.weekly_workout_target || 1
  const weeklyDone = summary?.weekly_workouts_completed || 0
  const progress = Math.min(100, (weeklyDone / weeklyTarget) * 100)
  const needsProgramSetup = !data?.active_program

  return (
    <main className="app-page home-page">
      <header className="home-greeting">
        <h1>Hi, {summary?.display_name || user.display_name || user.username}</h1>
        <p>Ready to train?</p>
      </header>

      <ErrorMessage message={error} onRetry={load} />

      <button className="home-primary-action" type="button" onClick={start} disabled={starting}>
        <span>
          {data?.active_workout
            ? 'Workout in progress'
            : needsProgramSetup
              ? 'First-time setup'
              : nextDay?.name || 'Choose your next session'}
        </span>
        <strong>
          {starting
            ? 'Starting...'
            : data?.active_workout
              ? 'Resume workout'
              : needsProgramSetup
                ? 'Build your program'
                : 'Start workout'}
        </strong>
      </button>

      {nextDay && !data?.active_workout && (
        <section className="home-program-card">
          <div>
            <span>{data.active_program.name}</span>
            <h2>{nextDay.name}</h2>
            <p>{nextDay.exercises.length} exercises</p>
          </div>
          <button className="button button-secondary button-small" type="button" onClick={start}>Start</button>
        </section>
      )}

      <section className="weekly-progress">
        <div><span>This week</span><strong>{weeklyDone} / {weeklyTarget} workouts</strong></div>
        <div className="progress-track" aria-label={`${weeklyDone} of ${weeklyTarget} weekly workouts`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="home-stats" aria-label="Progress summary">
        <div><Flame size={20} aria-hidden="true" /><strong>{summary?.current_streak || 0} days</strong><span>Streak</span></div>
        <div><Trophy size={20} aria-hidden="true" /><strong>Lv. {summary?.xp?.current_level || 1}</strong><span>Level</span></div>
        <div><Scale size={20} aria-hidden="true" /><strong>{data?.progress_summary?.latest_body_weight_kg == null ? '—' : formatWeight(data.progress_summary.latest_body_weight_kg, unit)}</strong><span>Weight</span></div>
      </section>

      <section className="last-workout">
        <div className="section-row"><h2>Last workout</h2><Link to="/history">View history →</Link></div>
        {recent ? (
          <Link className="last-workout-link" to={`/history/${recent.id}`}>
            <strong>{recent.name}</strong>
            <span>{formatDate(recent.started_at)} · {formatDuration(recent.duration_seconds)}</span>
          </Link>
        ) : (
          <p className="inline-empty">No workouts yet.</p>
        )}
      </section>
    </main>
  )
}

export default DashboardPage
