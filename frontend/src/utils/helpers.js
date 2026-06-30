export function resolveHomePath(user) {
  if (!user) return '/login'
  if (user.role === 'resident') return '/resident/dashboard'
  if (user.role === 'manager') return '/manager/dashboard'
  return '/admin/dashboard'
}