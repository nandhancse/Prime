import { BarChart3, ClipboardList, Dumbbell, Home, Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'


const links = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/workout', label: 'Workout', icon: Dumbbell },
  { to: '/programs', label: 'Programs', icon: ClipboardList },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/more', label: 'More', icon: Menu },
]

function MobileNavigation() {
  return (
    <nav className="mobile-navigation" aria-label="Mobile navigation">
      {links.map((link) => (
        <NavLink
          className={({ isActive }) => (isActive ? 'active' : '')}
          key={link.to}
          to={link.to}
        >
          <link.icon size={21} strokeWidth={1.8} aria-hidden="true" />
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default MobileNavigation
