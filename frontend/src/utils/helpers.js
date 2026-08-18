import { UserRole } from './constants'

export function formatArea(area) {
  const value = Number.parseFloat(area)
  if (Number.isNaN(value)) return String(area ?? '')
  return `${value % 1 === 0 ? value.toFixed(0) : value} متر مربع`
}

export function formatCurrency(amount) {
  const value = Number.parseFloat(amount)
  if (Number.isNaN(value)) return String(amount ?? '')
  // Latin digits with thousands grouping, matching how the rest of the app
  // renders numbers (areas, phone numbers, national ids).
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} تومان`
}

export function formatDate(dateString) {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return String(dateString)
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch {
    return String(dateString)
  }
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' })

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

// Announcements are scanned at a glance, so a recent one reads better as
// "۳ ساعت پیش" than as a calendar date. Past a week the relative wording stops
// helping ("۳۴ روز پیش" needs mental arithmetic), so it falls back to the
// absolute Jalali date. `now` is injectable to keep the tests deterministic.
export function formatRelativeDate(dateString, now = Date.now()) {
  if (!dateString) return ''

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return String(dateString)

  const elapsedSeconds = Math.round((now - date.getTime()) / 1000)

  // A clock skew between the server and the browser can date a just-published
  // announcement in the future; "هم‌اکنون" reads better than "۳ ثانیه بعد".
  if (elapsedSeconds < MINUTE) return 'هم‌اکنون'
  if (elapsedSeconds < HOUR) {
    return relativeTimeFormatter.format(-Math.floor(elapsedSeconds / MINUTE), 'minute')
  }
  if (elapsedSeconds < DAY) {
    return relativeTimeFormatter.format(-Math.floor(elapsedSeconds / HOUR), 'hour')
  }
  if (elapsedSeconds < WEEK) {
    return relativeTimeFormatter.format(-Math.floor(elapsedSeconds / DAY), 'day')
  }

  return formatDate(dateString)
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
