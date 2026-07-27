import { UserRole } from './constants'

export function formatArea(area) {
  const value = Number.parseFloat(area)
  if (Number.isNaN(value)) return String(area ?? '')
  return `${value % 1 === 0 ? value.toFixed(0) : value} متر مربع`
}

const homePaths = {
  [UserRole.RESIDENT]: '/resident/dashboard',
  [UserRole.MANAGER]: '/manager/dashboard',
  [UserRole.ADMIN]: '/admin/dashboard',
  [UserRole.SERVICE_STAFF]: '/service/dashboard',
}

export function resolveHomePath(user) {
  if (!user) return '/login'
  return homePaths[user.role] || '/login'
}
