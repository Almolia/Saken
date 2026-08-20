import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import { authApi } from '../lib/api'

/**
 * Clears all authentication-related cookies.
 * Uses the cookie names from the backend settings (defaults to saken_*).
 */
function clearAuthCookies() {
  const cookieNames = ['saken_access_token', 'saken_refresh_token', 'csrftoken']
  cookieNames.forEach((name) => {
    // Setting expires to Thu, 01 Jan 1970 00:00:00 GMT forces browser to delete the cookie
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.vercel.app; SameSite=Lax`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.onrender.com; SameSite=Lax`
  })
}

// The browser session is authoritative for the UI. Invalidating the server
// cookie is best-effort: an offline server must never trap the user on a
// protected dashboard after they have chosen to log out.
export function useLogout(setAuthState) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  return useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Continue with local logout. The expired/stale cookie will be rejected
      // by the backend and can be cleared by a later successful auth request.
    }

    // Always clear cookies locally to ensure logout works even if API fails
    clearAuthCookies()

    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    navigate('/login', { replace: true })
  }, [navigate, setAuthState, showToast])
}
