function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '')
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
    return normalizeBaseUrl(`${window.location.protocol}//${hostname}:8000/api`)
  }

  if (origin.includes('-5173.app.github.dev')) {
    return normalizeBaseUrl(origin.replace('-5173.app.github.dev', '-8000.app.github.dev') + '/api')
  }

  if (port === '5173') {
    return normalizeBaseUrl(origin.replace(/:5173$/, ':8000') + '/api')
  }

  return normalizeBaseUrl(`${origin}/api`)
}

const API_BASE_URL = inferApiBaseUrl()

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
  return ''
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

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      mode: 'cors',
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
      data?.detail ||
      data?.message ||
      Object.values(data || {}).flat().join(' ') ||
      'خطایی در ارتباط با سرور رخ داد.'
    throw new Error(message)
  }

  return data
}

export const authApi = {
  register(payload) {
    return request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  login(payload) {
    return request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  logout() {
    return request('/auth/logout/', {
      method: 'POST',
    })
  },
  me() {
    return request('/auth/me/')
  },
  changeAdminPassword(payload) {
    return request('/auth/admin/change-password/', {
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
}

export { API_BASE_URL }
