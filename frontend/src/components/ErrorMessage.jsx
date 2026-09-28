function ErrorMessage({ message, onRetry }) {
  if (!message) return null

  return (
    <div className="error-message" role="alert">
      <div>
        <strong>Something went wrong</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="button button-secondary button-small" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export default ErrorMessage
