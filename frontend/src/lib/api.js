function normalizeBaseUrl(url) {
  let clean = url.trim().replace(/\/+$/, '')
  if (!clean.endsWith('/api')) {
    clean = clean + '/api'
  }
  return clean
}

function inferApiBaseUrl() {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  if (envBaseUrl) {
    return normalizeBaseUrl(envBaseUrl)
  }

  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000/api'
  }

  const { origin, hostname, port } = window.location

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return normalizeBaseUrl(`${window.location.protocol}//${hostname}:8000`)
  }

  if (origin.includes('-5173.app.github.dev')) {
    return normalizeBaseUrl(origin.replace('-5173.app.github.dev', '-8000.app.github.dev'))
  }

  if (port === '5173') {
    return normalizeBaseUrl(origin.replace(/:5173$/, ':8000'))
  }

  return normalizeBaseUrl(origin)
}

const API_BASE_URL = inferApiBaseUrl()

// A lightweight, non-sensitive marker that tells us whether this browser has
// ever established a session. The auth cookies themselves are HttpOnly (not
// readable from JS), so without this flag the app would have to call
// /auth/me/ on every first paint — which blocks the UI for ~30s when the
// backend is cold-starting, even for visitors who never logged in.
const SESSION_FLAG_KEY = 'saken_session_active'

export function hasSessionFlag() {
  try {
    return localStorage.getItem(SESSION_FLAG_KEY) === '1'
  } catch {
    return true
  }
}

export function setSessionFlag(active) {
  try {
    if (active) {
      localStorage.setItem(SESSION_FLAG_KEY, '1')
    } else {
      localStorage.removeItem(SESSION_FLAG_KEY)
    }
  } catch {
    // Storage unavailable (private mode etc.) — the app still works, it just
    // falls back to always checking /auth/me/ on load.
  }
}

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
  return ''
}

function collectErrorMessages(value, messages = []) {
  if (typeof value === 'string') {
    const message = value.trim()
    if (message) messages.push(message)
    return messages
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectErrorMessages(item, messages))
    return messages
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectErrorMessages(item, messages))
  }

  return messages
}

async function request(path, options = {}) {
  const method = options.method || 'GET'
  const headers = {
    ...(options.headers || {}),
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    const csrfToken = getCookie('csrftoken')
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken
    }
  }

  // Prevent caching for sensitive auth endpoints (fix for logout+refresh bug)
  // The other agent correctly noted that /auth/me/ GET could be cached.
  // Using cache: no-store + explicit no-cache headers is the robust solution.
  const isAuthSensitive = path.includes('/auth/me') || path.includes('/auth/logout')
  if (isAuthSensitive) {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    headers['Pragma'] = 'no-cache'
    headers['Expires'] = '0'
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store',
      ...options,
      headers,
    })
  } catch {
    throw new Error(`ارتباط با سرور برقرار نشد. API فعلی: ${API_BASE_URL}`)
  }

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const message =
      collectErrorMessages(data).join(' ') ||
      'خطایی در ارتباط با سرور رخ داد.'
    const error = new Error(message)
    error.status = response.status
    error.details = data
    throw error
  }

  return data
}

export const authApi = {
  register(payload) {
    // SECURITY: the confirmation field is validated client-side; never send
    // the plaintext password twice over the wire.
    const safePayload = { ...payload }
    delete safePayload.password_confirmation
    return request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(safePayload),
    })
  },
  async login(payload) {
    const data = await request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSessionFlag(true)
    return data
  },
  async logout() {
    try {
      return await request('/auth/logout/', {
        method: 'POST',
        cache: 'no-store',
      })
    } finally {
      setSessionFlag(false)
    }
  },
  async me() {
    try {
      const data = await request('/auth/me/', {
        cache: 'no-store',
      })
      setSessionFlag(true)
      return data
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setSessionFlag(false)
      }
      throw error
    }
  },
  updateProfile(payload) {
    return request('/auth/profile/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  changePassword(payload) {
    return request('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateAdminProfile(payload) {
    return request('/auth/admin/profile/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  changeAdminPassword(payload) {
    return request('/auth/admin/change-password/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateServiceStaffProfile(payload) {
    return request('/auth/service-staff/profile/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  changeServiceStaffPassword(payload) {
    return request('/auth/service-staff/change-password/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export const managerApi = {
  users() {
    return request('/manager/users/')
  },
  updateUserRole(userId, payload) {
    return request(`/manager/users/${userId}/role/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  updateUserStatus(userId, isActive) {
    return request(`/manager/users/${userId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    })
  },
  units() {
    return request('/manager/units/')
  },
  createUnit(payload) {
    return request('/manager/units/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  assignUnit(unitId, payload) {
    return request(`/manager/units/${unitId}/assign/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  updateUnit(unitId, payload) {
    return request(`/manager/units/${unitId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  deleteUnit(unitId) {
    return request(`/manager/units/${unitId}/`, {
      method: 'DELETE',
    })
  },
  serviceStaff() {
    return request('/manager/service-staff/')
  },
  charges() {
    return request('/manager/charges/')
  },
  createCharge(payload) {
    return request('/manager/charges/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  building() {
    return request('/manager/building/')
  },
  createBuilding(payload) {
    return request('/manager/building/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateBuilding(payload) {
    return request('/manager/building/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  amenities() {
    return request('/manager/amenities/')
  },
  createAmenity(payload) {
    return request('/manager/amenities/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateAmenity(amenityId, payload) {
    return request(`/manager/amenities/${amenityId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  deleteAmenity(amenityId) {
    return request(`/manager/amenities/${amenityId}/`, {
      method: 'DELETE',
    })
  },
  announcements() {
    return request('/manager/announcements/')
  },
  createAnnouncement(payload) {
    return request('/manager/announcements/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateAnnouncement(announcementId, payload) {
    return request(`/manager/announcements/${announcementId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  deleteAnnouncement(announcementId) {
    return request(`/manager/announcements/${announcementId}/`, {
      method: 'DELETE',
    })
  },
}

export { API_BASE_URL, request }
