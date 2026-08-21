import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import { authApi } from '../lib/api'

/**
 * Clears all authentication-related cookies.
 * Note: HttpOnly cookies (saken_access_token, saken_refresh_token) CANNOT be
 * cleared via JavaScript - they must be cleared by the backend via Set-Cookie headers.
 * This function is a best-effort fallback for csrftoken and any non-HttpOnly cookies,
 * plus it clears localStorage/sessionStorage that might hold auth data.
 *
 * The backend's clear_auth_cookies is now fixed to properly delete with matching
 * Secure/SameSite/Domain attributes, so this frontend cleanup is secondary.
 */
function clearAuthCookies() {
  const cookieNames = ['saken_access_token', 'saken_refresh_token', 'csrftoken']
  
  // Try to clear with various combinations to handle different cookie configurations
  const domains = ['', '.vercel.app', '.onrender.com', window.location.hostname]
  const paths = ['/', '']
  const sameSiteValues = ['Lax', 'None', 'Strict']
  
  cookieNames.forEach((name) => {
    paths.forEach((path) => {
      // Basic deletion
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
      
      // With SameSite variations
      sameSiteValues.forEach((sameSite) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=${sameSite}`
        if (window.location.protocol === 'https:') {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=${sameSite}; Secure`
        }
        
        // With domains
        domains.forEach((domain) => {
          if (!domain) return
          try {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}; SameSite=${sameSite}`
            if (window.location.protocol === 'https:') {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}; SameSite=${sameSite}; Secure`
            }
          } catch {
            // Ignore domain errors
          }
        })
      })
    })
  })

  // Clear any potential localStorage/sessionStorage auth data
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('token') || key.includes('auth') || key.includes('saken') || key.includes('user'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore localStorage errors
  }

  try {
    const keysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.includes('token') || key.includes('auth') || key.includes('saken') || key.includes('user'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  } catch {
    // Ignore sessionStorage errors
  }
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

    // Clear auth state BEFORE navigation to prevent flash of protected content
    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    
    // Use replace to prevent back button from going to protected page
    // Also force a small delay to ensure state is cleared
    navigate('/login', { replace: true })
    
    // Extra safety: if user refreshes immediately after logout, ensure we don't
    // have stale data. We reload the page after a short delay if needed?
    // Instead, we ensure the AppRoutes will re-check auth on mount and get 401
  }, [navigate, setAuthState, showToast])
}
