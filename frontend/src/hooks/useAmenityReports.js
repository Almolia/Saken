import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { managerAmenityApi } from '../lib/amenityApi'
import {
  ReservationStatus,
  normalizeStatus,
  sortReservationLog,
  toReservationSearchQuery,
} from '../utils/reservations'

// Typing pauses for this long before the log is re-read, so a manager spelling
// out an amenity name costs one request instead of one per keystroke.
const SEARCH_DEBOUNCE_MS = 300

function normalizeReservations(data) {
  if (Array.isArray(data?.reservations)) return data.reservations
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

function normalizeAmenities(data) {
  if (Array.isArray(data?.amenities)) return data.amenities
  if (Array.isArray(data)) return data
  return []
}

function errorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback
}

/**
 * The building-wide amenity booking log for the manager's report.
 *
 * Searching, and narrowing by amenity or day, all happen on the server: the
 * log covers every resident and every facility, so it is not a list the
 * browser should be holding in full just to filter it.
 */
export function useAmenityReports() {
  const hasLoaded = useRef(false)
  const lastAmenityReloadKey = useRef(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [amenity, setAmenity] = useState('')
  const [date, setDate] = useState('')
  const [state, setState] = useState({
    reservations: [],
    loading: true,
    refreshing: false,
    searching: false,
    error: '',
  })
  // The amenity filter's options. A failure here only costs the dropdown, so
  // it is tracked apart from the report's own error.
  const [amenities, setAmenities] = useState([])
  const [amenitiesError, setAmenitiesError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    const isInitialLoad = !hasLoaded.current
    const isManualRefresh = !isInitialLoad && lastAmenityReloadKey.current !== reloadKey

    setState((current) => ({
      ...current,
      loading: isInitialLoad,
      refreshing: isManualRefresh,
      // A narrowing keeps the previous rows on screen; only the very first
      // read is allowed to blank the table.
      searching: !isInitialLoad && !isManualRefresh,
      error: '',
    }))

    managerAmenityApi
      .reservations({
        search: toReservationSearchQuery(debouncedSearch),
        amenity,
        date,
      })
      .then((data) => {
        if (!active) return
        hasLoaded.current = true
        setState({
          reservations: sortReservationLog(normalizeReservations(data)),
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
          error: errorMessage(error, 'خطایی در دریافت گزارش رزروها رخ داد.'),
        }))
      })

    return () => {
      // Stops a slow earlier search from overwriting a newer result set.
      active = false
    }
  }, [debouncedSearch, amenity, date, reloadKey])

  // The dropdown's options do not depend on the filters, so they are only
  // re-read on mount and on an explicit refresh — never on a keystroke.
  useEffect(() => {
    let active = true
    lastAmenityReloadKey.current = reloadKey

    managerAmenityApi
      .amenities()
      .then((data) => {
        if (!active) return
        setAmenities(normalizeAmenities(data))
        setAmenitiesError('')
      })
      .catch((error) => {
        if (!active) return
        setAmenities([])
        setAmenitiesError(errorMessage(error, 'خطایی در دریافت فهرست امکانات رخ داد.'))
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  // Counts describe what the table is currently showing, not the whole
  // building, so the cards never disagree with the rows underneath them.
  const summary = useMemo(() => {
    let active = 0
    let canceled = 0

    for (const reservation of state.reservations) {
      if (normalizeStatus(reservation.status) === ReservationStatus.CANCELED) canceled += 1
      else if (normalizeStatus(reservation.status) === ReservationStatus.ACTIVE) active += 1
    }

    return { total: state.reservations.length, active, canceled }
  }, [state.reservations])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  const clearSearch = useCallback(() => {
    setSearch('')
  }, [])

  const clearFilters = useCallback(() => {
    setSearch('')
    setAmenity('')
    setDate('')
  }, [])

  return {
    ...state,
    amenities,
    amenitiesError,
    summary,
    search,
    setSearch,
    clearSearch,
    debouncedSearch,
    isDebouncing: search.trim() !== debouncedSearch,
    amenity,
    setAmenity,
    date,
    setDate,
    hasFilters: Boolean(search.trim() || amenity || date),
    clearFilters,
    refresh,
  }
}
