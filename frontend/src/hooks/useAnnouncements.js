import { useCallback, useEffect, useRef, useState } from 'react'
import { residentAnnouncementApi } from '../lib/announcementApi'

function normalizeAnnouncements(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.announcements)) return data.announcements
  if (Array.isArray(data?.results)) return data.results
  return []
}

// fetchAnnouncements must be a stable reference (module-level function or
// memoized); a new inline function on each render would refetch in a loop.
export function useAnnouncements(fetchAnnouncements = residentAnnouncementApi.list) {
  const hasLoaded = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({
    announcements: [],
    loading: true,
    refreshing: false,
    error: '',
  })

  useEffect(() => {
    let active = true
    // A manual refresh keeps the already-visible feed on screen and only spins
    // the refresh button; the full-height loader is for the first read.
    const isInitialLoad = !hasLoaded.current

    setState((current) => ({
      ...current,
      loading: isInitialLoad,
      refreshing: !isInitialLoad,
      error: '',
    }))

    fetchAnnouncements()
      .then((data) => {
        if (!active) return
        hasLoaded.current = true
        setState({
          announcements: normalizeAnnouncements(data),
          loading: false,
          refreshing: false,
          error: '',
        })
      })
      .catch((error) => {
        if (!active) return
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: error.message || 'خطایی در دریافت اطلاعیه‌ها رخ داد.',
        }))
      })

    return () => {
      active = false
    }
  }, [fetchAnnouncements, reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  return { ...state, refresh }
}
