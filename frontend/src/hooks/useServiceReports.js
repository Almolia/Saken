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
    Pending: Number.isFinite(pending) ? pending : 0,
    Assigned: Number.isFinite(assigned) ? assigned : 0,
    Completed: Number.isFinite(completed) ? completed : 0,
  }
}

function errorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback
}

export function useServiceReports() {
  const hasLoaded = useRef(false)
  const lastSummaryReloadKey = useRef(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [state, setState] = useState({
    summary: {
      Pending: 0,
      Assigned: 0,
      Completed: 0,
    },
    requests: [],
    loading: true,
    refreshing: false,
    searching: false,
    error: '',
    summaryError: '',
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    const isInitialLoad = !hasLoaded.current
    const shouldFetchSummary = lastSummaryReloadKey.current !== reloadKey
    const isManualRefresh = !isInitialLoad && shouldFetchSummary

    setState((current) => ({
      ...current,
      loading: isInitialLoad,
      refreshing: isManualRefresh,
      searching: !isInitialLoad && !isManualRefresh,
      error: '',
      summaryError: shouldFetchSummary ? '' : current.summaryError,
    }))

    const listRequest = managerServiceRequestApi.listAll(debouncedSearch)
    // Summary counts represent all requests, not only the search results. Fetch
    // them on mount and explicit refreshes, but do not repeat that request after
    // every keystroke.
    const summaryRequest = shouldFetchSummary
      ? managerServiceRequestApi.summary()
      : Promise.resolve(null)

    Promise.allSettled([listRequest, summaryRequest]).then(([listResult, summaryResult]) => {
      if (!active) return

      if (shouldFetchSummary) {
        lastSummaryReloadKey.current = reloadKey
      }
      if (listResult.status === 'fulfilled') {
        hasLoaded.current = true
      }

      setState((current) => ({
        ...current,
        summary:
          shouldFetchSummary && summaryResult.status === 'fulfilled'
            ? normalizeSummary(summaryResult.value)
            : current.summary,
        requests:
          listResult.status === 'fulfilled'
            ? normalizeRequests(listResult.value)
            : current.requests,
        loading: false,
        refreshing: false,
        searching: false,
        error:
          listResult.status === 'rejected'
            ? errorMessage(listResult.reason, 'خطایی در دریافت گزارش‌های خدمات رخ داد.')
            : '',
        summaryError:
          shouldFetchSummary && summaryResult.status === 'rejected'
            ? errorMessage(summaryResult.reason, 'خطایی در دریافت آمار درخواست‌ها رخ داد.')
            : shouldFetchSummary
              ? ''
              : current.summaryError,
      }))
    })

    return () => {
      // Prevent slow, older searches from replacing a newer result set.
      active = false
    }
  }, [debouncedSearch, reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  const clearSearch = useCallback(() => {
    setSearch('')
  }, [])

  return {
    ...state,
    search,
    setSearch,
    clearSearch,
    debouncedSearch,
    isDebouncing: search.trim() !== debouncedSearch,
    refresh,
  }
}
