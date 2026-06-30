import { Navigate } from 'react-router-dom'
import { resolveHomePath } from '../utils/helpers'

export function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to={resolveHomePath(user)} replace />
  return children
}