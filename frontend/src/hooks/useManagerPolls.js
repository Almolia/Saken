import { useCallback, useEffect, useMemo, useState } from 'react'
import { managerApi } from '../lib/api'
import { managerPollApi } from '../lib/pollApi'
import { filterPolls, sortPolls, summarizePolls } from '../utils/polls'

function normalizePolls(data) {
  if (Array.isArray(data?.polls)) return data.polls
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

function normalizeUnits(data) {
  if (Array.isArray(data?.units)) return data.units
  if (Array.isArray(data)) return data
  return []
}

function errorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback
}

/**
 * The manager's master list of building polls.
 *
 * The endpoint serves every poll in one response with no query parameters, so
 * the status filter and the search box work on the array already in memory
 * rather than costing a request per keystroke.
 *
 * The unit directory is fetched alongside it: a poll only stores the ids of the
 * units it targets, and both the list and the form need their unit numbers.
 */
export function useManagerPolls() {
  const [reloadKey, setReloadKey] = useState(0)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [state, setState] = useState({
    polls: [],
    loading: true,
    refreshing: false,
    error: '',
  })
  // Losing the unit directory only costs the target picker and the unit names,
  // so it is tracked apart from the list's own error.
  const [units, setUnits] = useState([])
  const [unitsError, setUnitsError] = useState('')

  useEffect(() => {
    let active = true

    setState((current) => ({
      ...current,
      // A manual refresh keeps the current rows on screen; only the first read
      // is allowed to blank the list.
      loading: current.polls.length === 0,
      refreshing: current.polls.length > 0,
      error: '',
    }))

    managerPollApi
      .list()
      .then((data) => {
        if (!active) return
        setState({
          polls: sortPolls(normalizePolls(data)),
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
          error: errorMessage(error, 'خطایی در دریافت نظرسنجی‌ها رخ داد.'),
        }))
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  useEffect(() => {
    let active = true

    managerApi
      .units()
      .then((data) => {
        if (!active) return
        setUnits(normalizeUnits(data))
        setUnitsError('')
      })
      .catch((error) => {
        if (!active) return
        setUnits([])
        setUnitsError(errorMessage(error, 'خطایی در دریافت فهرست واحدها رخ داد.'))
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  // The cards describe the whole building, not the narrowed view, so they stay
  // a stable picture of how many polls exist while a filter is applied.
  const summary = useMemo(() => summarizePolls(state.polls), [state.polls])

  const visiblePolls = useMemo(
    () => filterPolls(state.polls, { status, search }),
    [state.polls, status, search],
  )

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  // A new poll belongs at the top of a newest-first list. Filtering by id first
  // keeps a retried POST from showing the same record twice.
  const addPoll = useCallback((poll) => {
    if (!poll) return
    setState((current) => ({
      ...current,
      polls: sortPolls([poll, ...current.polls.filter((item) => item.id !== poll.id)]),
    }))
  }, [])

  // Edits, publishing and closing all keep their place: only created_at decides
  // the order and none of them touches it.
  const replacePoll = useCallback((poll) => {
    if (!poll) return
    setState((current) => ({
      ...current,
      polls: current.polls.map((item) => (item.id === poll.id ? poll : item)),
    }))
  }, [])

  const removePoll = useCallback((pollId) => {
    setState((current) => ({
      ...current,
      polls: current.polls.filter((item) => item.id !== pollId),
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setStatus('all')
    setSearch('')
  }, [])

  return {
    ...state,
    polls: state.polls,
    visiblePolls,
    units,
    unitsError,
    summary,
    status,
    setStatus,
    search,
    setSearch,
    hasFilters: status !== 'all' || Boolean(search.trim()),
    clearFilters,
    refresh,
    addPoll,
    replacePoll,
    removePoll,
  }
}
