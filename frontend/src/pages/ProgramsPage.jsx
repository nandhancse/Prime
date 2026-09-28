import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { activateProgram, getPrograms } from '../api/programs.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PageHeader from '../components/PageHeader.jsx'


function ProgramsPage() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadPrograms = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setPrograms(await getPrograms())
    } catch {
      setError('Your workout programs could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPrograms()
  }, [loadPrograms])

  async function handleActivate(id) {
    setBusyId(id)
    setMessage('')
    try {
      await activateProgram(id)
      setMessage('Active program updated.')
      await loadPrograms()
    } catch {
      setError('The program could not be activated.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="app-page">
      <PageHeader
        title="Programs"
        actions={<Link className="button button-primary" to="/programs/new">+ New Program</Link>}
      />

      {message && <p className="status-banner success" role="status">{message}</p>}
      <ErrorMessage message={error} onRetry={loadPrograms} />

      {loading ? (
        <LoadingSpinner label="Loading workout programs..." />
      ) : programs.length === 0 ? (
        <EmptyState
          title="No program yet."
          message="Create your first one."
        >
          <Link className="button button-primary" to="/programs/new">Create your first program</Link>
        </EmptyState>
      ) : (
        <section className="program-grid">
          {programs.map((program) => (
            <article className={`program-card${program.is_active ? ' active' : ''}`} key={program.id}>
              <div className="program-card-topline">
                {program.is_active && <span className="badge active">Active</span>}
              </div>
              <h2>{program.name}</h2>
              <p>{program.day_count} {program.day_count === 1 ? 'day' : 'days'}</p>
              <div className="card-actions wrap">
                <Link className="button button-secondary button-small" to={`/programs/${program.id}`}>Open</Link>
                {!program.is_active && (
                  <button className="text-button accent" type="button" disabled={busyId === program.id} onClick={() => handleActivate(program.id)}>
                    {busyId === program.id ? 'Activating...' : 'Activate'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

    </main>
  )
}

export default ProgramsPage
