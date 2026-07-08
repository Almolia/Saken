import { useCallback, useEffect, useState } from 'react'
import { unitApi } from '../lib/unitApi'

// The endpoint returns one unit object, or an array when a resident has
// several units; the dashboard currently shows the first one either way.
function normalizeUnit(data) {
  if (Array.isArray(data)) return data[0] ?? null
  return data ?? null
}

// fetchUnit must be a stable reference (module-level function or memoized);
// passing a new inline function on each render would refetch in a loop.
export function useMyUnit(fetchUnit = unitApi.myUnit) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ unit: null, loading: true, error: '' })

  useEffect(() => {
    let active = true
    fetchUnit()
      .then((data) => active && setState({ unit: normalizeUnit(data), loading: false, error: '' }))
      .catch((error) => {
        if (!active) return
        // 404 = no unit assigned to this user; show the empty state, not an error.
        if (error.status === 404) {
          setState({ unit: null, loading: false, error: '' })
          return
        }
        setState({ unit: null, loading: false, error: error.message || 'خطایی در دریافت اطلاعات واحد رخ داد.' })
      })
    return () => {
      active = false
    }
  }, [fetchUnit, attempt])

  const retry = useCallback(() => {
    setState({ unit: null, loading: true, error: '' })
    setAttempt((current) => current + 1)
  }, [])

  return { ...state, retry }
}
