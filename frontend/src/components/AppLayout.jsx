import { Link, Outlet } from 'react-router-dom'
import MobileNavigation from './MobileNavigation.jsx'
import Sidebar from './Sidebar.jsx'
import '../styles/application.css'


function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        {import.meta.env.DEV && (
          <Link className="dev-status-link" to="/dev-status">Dev status</Link>
        )}
        <Outlet />
      </div>
      <MobileNavigation />
    </div>
  )
}

export default AppLayout
