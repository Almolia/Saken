import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { authApi } from '../lib/api'
import { resolveHomePath } from '../utils/helpers'
import { ProtectedRoute } from './ProtectedRoute'
import { FullscreenLoader } from '../components/ui/FullscreenLoader'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { RolePlaceholderPage } from '../pages/dashboard/RolePlaceholderPage'
import { AdminDashboardPage } from '../pages/dashboard/AdminDashboardPage'

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
          <ProtectedRoute user={authState.user} allowedRoles={['resident']}>
            <RolePlaceholderPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={['manager']}>
            <RolePlaceholderPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={['admin']}>
            <AdminDashboardPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}