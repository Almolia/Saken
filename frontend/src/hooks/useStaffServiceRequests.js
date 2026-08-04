import { useCallback, useEffect, useRef, useState } from 'react'
import { staffServiceRequestApi } from '../lib/serviceRequestApi'

function normalizeRequests(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.requests)) return data.requests
  return []
}

// Maintenance tasks assigned to the signed-in service staff member.
export function useStaffServiceRequests() {
  const hasLoaded = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({
    requests: [],
    loading: true,
    refreshing: false,
    error: '',
  })

  useEffect(() => {
    let active = true
    const isInitialLoad = !hasLoaded.current

    setState((current) => ({
      ...current,
      loading: isInitialLoad,
      refreshing: !isInitialLoad,
      error: '',
    }))

    staffServiceRequestApi
      .listAssigned()
      .then((data) => {
        if (!active) return
        hasLoaded.current = true
        setState({
          requests: normalizeRequests(data),
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
          error: error.message || 'خطایی در دریافت وظایف رخ داد.',
        }))
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  const updateRequest = useCallback((updatedRequest) => {
    setState((current) => ({
      ...current,
      requests: current.requests.map((item) =>
        item.id === updatedRequest.id ? { ...item, ...updatedRequest } : item,
      ),
    }))
  }, [])

  return { ...state, refresh, updateRequest }
}
