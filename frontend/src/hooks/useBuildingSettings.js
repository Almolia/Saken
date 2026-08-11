import { useCallback, useEffect, useState } from 'react'
import { managerApi } from '../lib/api'

// The API answers with the building object itself on GET and wraps it as
// { message, building } on write; both shapes reduce to the same record.
function normalizeBuilding(data) {
  return data?.building ?? data ?? null
}

// fetchBuilding must be a stable reference (module-level function or memoized);
// passing a new inline function on each render would refetch in a loop.
export function useBuildingSettings(fetchBuilding = managerApi.building) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({
    building: null,
    loading: true,
    error: '',
    // 404 means the building record has not been registered yet. That is an
    // empty state with its own form, not a failure.
    missing: false,
  })

  useEffect(() => {
    let active = true

    fetchBuilding()
      .then((data) => {
        if (!active) return
        setState({ building: normalizeBuilding(data), loading: false, error: '', missing: false })
      })
      .catch((error) => {
        if (!active) return
        if (error.status === 404) {
          setState({ building: null, loading: false, error: '', missing: true })
          return
        }
        setState({
          building: null,
          loading: false,
          error: error.message || 'خطایی در دریافت اطلاعات ساختمان رخ داد.',
          missing: false,
        })
      })

    return () => {
      active = false
    }
  }, [fetchBuilding, attempt])

  const retry = useCallback(() => {
    setState({ building: null, loading: true, error: '', missing: false })
    setAttempt((current) => current + 1)
  }, [])

  // Called with what the server returned from a save, so the form and the
  // total-units figure stay on the authoritative copy without a refetch.
  const applyBuilding = useCallback((data) => {
    const building = normalizeBuilding(data)
    if (!building) return
    setState({ building, loading: false, error: '', missing: false })
  }, [])

  return { ...state, retry, applyBuilding }
}
