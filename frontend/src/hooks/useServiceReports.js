import { useCallback, useEffect, useRef, useState } from 'react'
import { managerServiceRequestApi } from '../lib/serviceRequestApi'

function normalizeRequests(data) {
  if (Array.isArray(data?.requests)) return data.requests
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

function normalizeSummary(data) {
  const pending = Number(data?.Pending ?? data?.pending ?? 0)
  const assigned = Number(data?.Assigned ?? data?.assigned ?? 0)
  const completed = Number(data?.Completed ?? data?.completed ?? 0)
  return {
    Pending: pending,
    Assigned: assigned,
    Completed: completed,
    pending,
    assigned,
    completed,
  }
}

export function useServiceReports() {
  const hasLoaded = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [state, setState] = useState({
    summary: {
      Pending: 0,
      Assigned: 0,
      Completed: 0,
      pending: 0,
      assigned: 0,
      completed: 0,
    },
    requests: [],
    loading: true,
    refreshing: false,
    searching: false,
    error: '',
  })

  // Debounce search input changes by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  // Fetch summary and requests (initial load & whenever debounced search or reloadKey changes)
  useEffect(() => {
    let active = true
    const isInitialLoad = !hasLoaded.current

    setState((current) => ({
      ...current,
      loading: isInitialLoad,
      refreshing: !isInitialLoad && !debouncedSearch,
      searching: !isInitialLoad && Boolean(debouncedSearch),
      error: '',
    }))

    Promise.all([
      managerServiceRequestApi.summary(),
      managerServiceRequestApi.listAll(debouncedSearch),
    ])
      .then(([summaryData, listData]) => {
        if (!active) return
        hasLoaded.current = true
        setState({
          summary: normalizeSummary(summaryData),
          requests: normalizeRequests(listData),
          loading: false,
          refreshing: false,
          searching: false,
          error: '',
        })
      })
      .catch((error) => {
        if (!active) return
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          searching: false,
          error: error.message || 'خطایی در دریافت گزارش‌های خدمات رخ داد.',
        }))
      })

    return () => {
      active = false
    }
  }, [debouncedSearch, reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  return {
    ...state,
    search,
    setSearch,
    debouncedSearch,
    refresh,
  }
}
