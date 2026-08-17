import { useCallback, useEffect, useState } from 'react'
import { managerApi } from '../lib/api'

function normalizeAnnouncements(data) {
  if (Array.isArray(data?.announcements)) return data.announcements
  if (Array.isArray(data)) return data
  return []
}

// fetchAnnouncements must be a stable reference (module-level function or
// memoized); a new inline function on each render would refetch in a loop.
export function useManagerAnnouncements(fetchAnnouncements = managerApi.announcements) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ announcements: [], loading: true, error: '' })

  useEffect(() => {
    let active = true

    fetchAnnouncements()
      .then((data) => {
        if (!active) return
        setState({ announcements: normalizeAnnouncements(data), loading: false, error: '' })
      })
      .catch((error) => {
        if (!active) return
        setState({
          announcements: [],
          loading: false,
          error: error.message || 'خطایی در دریافت اطلاعیه‌ها رخ داد.',
        })
      })

    return () => {
      active = false
    }
  }, [fetchAnnouncements, attempt])

  const retry = useCallback(() => {
    setState({ announcements: [], loading: true, error: '' })
    setAttempt((current) => current + 1)
  }, [])

  // The list is ordered newest-first, so a freshly published announcement
  // belongs at the top. Filtering by id first keeps a retried POST from
  // showing the same record twice.
  const addAnnouncement = useCallback((announcement) => {
    if (!announcement) return
    setState((current) => ({
      ...current,
      announcements: [
        announcement,
        ...current.announcements.filter((item) => item.id !== announcement.id),
      ],
    }))
  }, [])

  // Edits and publish/archive toggles keep their place in the list — only
  // created_at decides the order and an update never changes it.
  const replaceAnnouncement = useCallback((announcement) => {
    if (!announcement) return
    setState((current) => ({
      ...current,
      announcements: current.announcements.map((item) =>
        item.id === announcement.id ? announcement : item,
      ),
    }))
  }, [])

  const removeAnnouncement = useCallback((announcementId) => {
    setState((current) => ({
      ...current,
      announcements: current.announcements.filter((item) => item.id !== announcementId),
    }))
  }, [])

  return { ...state, retry, addAnnouncement, replaceAnnouncement, removeAnnouncement }
}
