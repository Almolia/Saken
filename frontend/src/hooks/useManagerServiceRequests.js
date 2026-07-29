import { useCallback, useEffect, useRef, useState } from 'react'
import { managerServiceRequestApi } from '../lib/serviceRequestApi'

function normalizeRequests(data) {
  if (Array.isArray(data?.requests)) return data.requests
  if (Array.isArray(data)) return data
  return []
}

export function useManagerServiceRequests() {
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

    managerServiceRequestApi
      .listAll()
      .then((data) => {
        if (!active) return
        hasLoaded.current = true
        setState((current) => ({
          ...current,
          requests: normalizeRequests(data),
          loading: false,
          refreshing: false,
          error: '',
        }))
      })
      .catch((error) => {
        if (!active) return
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: error.message || 'خطایی در دریافت درخواست‌های خدمات رخ داد.',
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
        item.id === updatedRequest.id ? updatedRequest : item,
      ),
    }))
  }, [])

  return { ...state, refresh, updateRequest }
}
