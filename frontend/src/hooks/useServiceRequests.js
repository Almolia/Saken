import { useCallback, useEffect, useRef, useState } from 'react'
import { serviceRequestApi } from '../lib/serviceRequestApi'

function normalizeRequests(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function mergeRequests(currentRequests, fetchedRequests) {
  const fetchedIds = new Set(fetchedRequests.map((serviceRequest) => serviceRequest.id))
  const locallyAddedRequests = currentRequests.filter(
    (serviceRequest) => !fetchedIds.has(serviceRequest.id),
  )

  return [...locallyAddedRequests, ...fetchedRequests]
}

export function useServiceRequests(fetchRequests = serviceRequestApi.list) {
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

    fetchRequests()
      .then((data) => {
        if (!active) return

        hasLoaded.current = true
        const fetchedRequests = normalizeRequests(data)
        setState((current) => ({
          requests: mergeRequests(current.requests, fetchedRequests),
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
  }, [fetchRequests, reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  const addRequest = useCallback((serviceRequest) => {
    setState((current) => ({
      ...current,
      requests: [
        serviceRequest,
        ...current.requests.filter((request) => request.id !== serviceRequest.id),
      ],
    }))
  }, [])

  return { ...state, refresh, addRequest }
}
