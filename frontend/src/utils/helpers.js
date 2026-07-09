export function formatArea(area) {
  const value = Number.parseFloat(area)
  if (Number.isNaN(value)) return String(area ?? '')
  return `${value % 1 === 0 ? value.toFixed(0) : value} متر مربع`
}

export function resolveHomePath(user) {
  if (!user) return '/login'
  if (user.role === 'resident') return '/resident/dashboard'
  if (user.role === 'manager') return '/manager/dashboard'
  return '/admin/dashboard'
}