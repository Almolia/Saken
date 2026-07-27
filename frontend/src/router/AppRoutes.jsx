import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { FullscreenLoader } from '../components/ui/FullscreenLoader'
import { authApi } from '../lib/api'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { AdminDashboardPage } from '../pages/dashboard/AdminDashboardPage'
import { ManagerDashboardPage } from '../pages/dashboard/ManagerDashboardPage'
import { ResidentDashboardPage } from '../pages/dashboard/ResidentDashboardPage'
import { RolePlaceholderPage } from '../pages/dashboard/RolePlaceholderPage'
import { UserRole } from '../utils/constants'
import { resolveHomePath } from '../utils/helpers'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  const [authState, setAuthState] = useState({ loading: true, user: null })

  useEffect(() => {
    let active = true
    authApi
      .me()
      .then((data) => active && setAuthState({ loading: false, user: data.user }))
      .catch(() => active && setAuthState({ loading: false, user: null }))
    return () => {
      active = false
    }
  }, [])

  if (authState.loading) return <FullscreenLoader />

  return (
    <Routes>
      <Route path="/" element={<Navigate to={resolveHomePath(authState.user)} replace />} />
      <Route path="/login" element={<LoginPage authState={authState} setAuthState={setAuthState} />} />
      <Route path="/register" element={<RegisterPage authState={authState} />} />
      <Route
        path="/resident/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={[UserRole.RESIDENT]}>
            <ResidentDashboardPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={[UserRole.MANAGER]}>
            <ManagerDashboardPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={[UserRole.ADMIN]}>
            <AdminDashboardPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/service/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={[UserRole.SERVICE_STAFF]}>
            <RolePlaceholderPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/service"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={[UserRole.SERVICE_STAFF]}>
            <Navigate to="/service/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/service/*"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={[UserRole.SERVICE_STAFF]}>
            <Navigate to="/service/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
