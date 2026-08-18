import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import { authApi } from '../lib/api'

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

    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    navigate('/login', { replace: true })
  }, [navigate, setAuthState, showToast])
}
