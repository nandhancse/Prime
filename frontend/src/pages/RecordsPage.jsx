import { useCallback, useEffect, useMemo, useState } from 'react'
import { getPersonalRecords } from '../api/records.js'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/useAuth.js'
import { formatDate, formatWeight } from '../utils/format.js'


function recordValue(record, unit) {
  if (record.record_type === 'weight_reps') return `${record.repetitions} reps at ${formatWeight(record.weight, unit)}`
  if (record.record_type === 'heaviest_weight' || record.record_type === 'estimated_1rm') return formatWeight(record.record_value, unit)
  return `${Number(record.record_value).toLocaleString()} ${unit}`
}

function RecordsPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRecords(await getPersonalRecords())
    } catch {
      setError('Records could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const grouped = useMemo(() => {
    const result = new Map()
    records.filter((record) => record.exercise_name.toLowerCase().includes(search.toLowerCase())).forEach((record) => {
      if (!result.has(record.exercise_name)) result.set(record.exercise_name, [])
      result.get(record.exercise_name).push(record)
    })
    return [...result.entries()]
  }, [records, search])

  return (
    <main className="app-page narrow-page">
      <PageHeader title="Records" />
      <label className="standalone-search"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Exercise" /></label>
      <ErrorMessage message={error} onRetry={load} />
      {loading ? <LoadingSpinner label="Loading records..." /> : grouped.length === 0 ? (
        <EmptyState title="No records yet." message="Finish a workout to set one." />
      ) : (
        <section className="record-list">
          {grouped.map(([exerciseName, items]) => (
            <article key={exerciseName}>
              <h2>{exerciseName}</h2>
              {items.map((record) => (
                <div key={record.id}><span>{record.record_type_display}</span><strong>{recordValue(record, user.preferred_weight_unit || 'kg')}</strong><small>{formatDate(record.achieved_at)}</small></div>
              ))}
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default RecordsPage
