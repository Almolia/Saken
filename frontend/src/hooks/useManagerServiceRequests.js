import { useCallback, useEffect, useRef, useState } from 'react'
import { managerServiceRequestApi } from '../lib/serviceRequestApi'
import { SortOrder, StatusFilter, toApiStatus } from '../utils/serviceRequests'

function normalizeRequests(data) {
  if (Array.isArray(data?.requests)) return data.requests
  if (Array.isArray(data)) return data
  return []
}

export function useManagerServiceRequests(initialStatus = StatusFilter.ALL) {
  const hasLoaded = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [status, setStatus] = useState(initialStatus)
  const [ordering, setOrdering] = useState(SortOrder.NEWEST)
  const [state, setState] = useState({
    requests: [],
    loading: true,
    refreshing: false,
    error: '',
  })
  // Per-status totals, read separately so the filter tabs and the summary
  // cards keep showing the whole picture while the list itself is narrowed.
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let active = true
    // Only the very first read blanks the panel. Changing a filter or
    // refreshing after an action keeps the current rows on screen and shows
    // the lighter "refreshing" treatment instead.
    const isInitialLoad = !hasLoaded.current

    setState((current) => ({
      ...current,
      loading: isInitialLoad,
      refreshing: !isInitialLoad,
      error: '',
    }))

    managerServiceRequestApi
      .listAll({ status: toApiStatus(status), ordering })
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
          error: error.message || 'خطایی در دریافت درخواست‌های خدمات رخ داد.',
        }))
      })

    return () => {
      active = false
    }
  }, [status, ordering, reloadKey])

  // The totals do not depend on the active filter, so they are only re-read on
  // an explicit refresh, not when the manager switches tabs.
  useEffect(() => {
    let active = true

    managerServiceRequestApi
      .summary()
      .then((data) => active && setSummary(data || null))
      // A missing summary only costs the tab counters, so it stays silent
      // rather than turning the whole panel into an error state.
      .catch(() => active && setSummary(null))

    return () => {
      active = false
    }
  }, [reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  // Applied after an assignment or a settlement. The row is patched straight
  // away so the change is visible immediately, then the filtered view is
  // re-read: assigning a Pending request makes it Assigned, which may mean it
  // no longer belongs in the list the manager is looking at.
  const updateRequest = useCallback((updatedRequest) => {
    if (!updatedRequest) return

    setState((current) => ({
      ...current,
      requests: current.requests.map((item) =>
        item.id === updatedRequest.id ? updatedRequest : item,
      ),
    }))
    setReloadKey((current) => current + 1)
  }, [])

  return {
    ...state,
    summary,
    status,
    setStatus,
    ordering,
    setOrdering,
    refresh,
    updateRequest,
  }
}
