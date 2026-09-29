import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import NativeBackHandler from './components/NativeBackHandler.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import DevStatusPage from './pages/DevStatusPage.jsx'
import ExercisesPage from './pages/ExercisesPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProgramBuilderPage from './pages/ProgramBuilderPage.jsx'
import ProgramDetailPage from './pages/ProgramDetailPage.jsx'
import ProgramsPage from './pages/ProgramsPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import MorePage from './pages/MorePage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ProgressPage from './pages/ProgressPage.jsx'
import RecordsPage from './pages/RecordsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import WorkoutHubPage from './pages/WorkoutHubPage.jsx'
import WorkoutDetailPage from './pages/WorkoutDetailPage.jsx'
import WorkoutPage from './pages/WorkoutPage.jsx'
import './App.css'


function App() {
  return (
    <AuthProvider>
      <NativeBackHandler />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workout" element={<WorkoutHubPage />} />
          {import.meta.env.DEV && <Route path="/dev-status" element={<DevStatusPage />} />}
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/new" element={<ProgramBuilderPage />} />
          <Route path="/programs/:programId" element={<ProgramDetailPage />} />
          <Route path="/programs/:programId/edit" element={<ProgramBuilderPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:sessionId" element={<WorkoutDetailPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/more" element={<MorePage />} />
        </Route>
        <Route path="/workout/:sessionId" element={<ProtectedRoute><WorkoutPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
