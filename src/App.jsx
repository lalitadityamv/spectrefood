import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import ParticipantDashboard from './pages/ParticipantDashboard'
import AdminDashboard from './pages/AdminDashboard'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-muted)] text-sm font-mono">Loading session…</p>
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/login" replace />
  if (requireAdmin && profile.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}

function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return null
  if (!session || !profile) return <Navigate to="/login" replace />
  if (profile.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
