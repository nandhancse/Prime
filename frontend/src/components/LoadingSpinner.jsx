function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-ring" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export default LoadingSpinner
