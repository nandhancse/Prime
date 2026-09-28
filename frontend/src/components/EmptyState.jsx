function EmptyState({ title, message, children }) {
  return (
    <div className="empty-state">
      <span className="empty-state-mark" aria-hidden="true">P</span>
      <h2>{title}</h2>
      <p>{message}</p>
      {children && <div className="empty-state-actions">{children}</div>}
    </div>
  )
}

export default EmptyState
