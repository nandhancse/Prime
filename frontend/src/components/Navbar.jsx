import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'


function Navbar() {
  const { isAuthenticated, loading, logout } = useAuth()

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="PRime home">
        <span className="brand-mark">P</span>
        <span>PRime</span>
      </Link>

      {!loading && (
        <nav className="site-nav" aria-label="Primary navigation">
          {isAuthenticated ? (
            <>
              <Link className="nav-link" to="/dashboard">Dashboard</Link>
              <button className="button button-secondary nav-button" type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="nav-link" to="/login">Login</Link>
              <Link className="button button-secondary nav-button" to="/register">
                Create account
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  )
}

export default Navbar
