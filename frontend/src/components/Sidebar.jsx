import {
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  History,
  Home,
  LogOut,
  Medal,
  Settings,
  UserRound,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'


const primaryLinks = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/workout', label: 'Workout', icon: Dumbbell },
  { to: '/programs', label: 'Programs', icon: ClipboardList },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
]

const moreLinks = [
  { to: '/exercises', label: 'Exercises', icon: BookOpen },
  { to: '/history', label: 'History', icon: History },
  { to: '/records', label: 'Records', icon: Medal },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar">
      <NavLink className="app-brand" to="/dashboard" aria-label="PRime dashboard">
        <span className="brand-mark">P</span>
        <span>PRime</span>
      </NavLink>

      <nav className="sidebar-nav" aria-label="Application navigation">
        {primaryLinks.map((link) => (
          <NavLink
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            key={link.to}
            to={link.to}
          >
            <link.icon size={19} strokeWidth={1.8} aria-hidden="true" />
            {link.label}
          </NavLink>
        ))}
        <span className="sidebar-section-label">More</span>
        {moreLinks.map((link) => (
          <NavLink
            className={({ isActive }) => `sidebar-link secondary${isActive ? ' active' : ''}`}
            key={link.to}
            to={link.to}
          >
            <link.icon size={18} strokeWidth={1.8} aria-hidden="true" />
            {link.label}
            <ChevronRight className="sidebar-chevron" size={15} aria-hidden="true" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-profile">
        <div className="profile-avatar" aria-hidden="true">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <strong>{user.username}</strong>
          <span>{user.email}</span>
        </div>
        <button type="button" onClick={logout}><LogOut size={17} aria-hidden="true" /> Logout</button>
      </div>
    </aside>
  )
}

export default Sidebar
