import {
  BookOpen,
  ChevronRight,
  History,
  LogOut,
  Medal,
  Settings,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../context/useAuth.js'


const links = [
  { to: '/exercises', label: 'Exercises', icon: BookOpen },
  { to: '/history', label: 'History', icon: History },
  { to: '/records', label: 'Records', icon: Medal },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function MorePage() {
  const { logout } = useAuth()

  return (
    <main className="app-page narrow-page">
      <PageHeader title="More" />
      <nav className="menu-list" aria-label="More pages">
        {links.map((link) => (
          <Link key={link.to} to={link.to}>
            <link.icon size={22} aria-hidden="true" />
            <span>{link.label}</span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        ))}
        <button type="button" onClick={logout}>
          <LogOut size={22} aria-hidden="true" />
          <span>Logout</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </nav>
    </main>
  )
}

export default MorePage
