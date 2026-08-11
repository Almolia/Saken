import { useCallback, useEffect, useRef, useState } from 'react'
import { amenityApi } from '../lib/amenityApi'
import { ReservationApiStatus } from '../utils/reservations'

// The endpoint returns { reservations: [...] }; the extra shapes keep the UI
// working if the list is ever paginated or returned bare.
function normalizeReservations(data) {
  if (Array.isArray(data?.reservations)) return data.reservations
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

export function useMyReservations(fetchReservations = amenityApi.myReservations) {
  const hasLoaded = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({
    reservations: [],
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

    fetchReservations()
      .then((data) => {
        if (!active) return

        hasLoaded.current = true
        setState({
          reservations: normalizeReservations(data),
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
          error: error.message || 'خطایی در دریافت رزروهای شما رخ داد.',
        }))
      })

    return () => {
      active = false
    }
  }, [fetchReservations, reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  // The booking is already canceled server-side, so the row moves to the
  // "canceled" bucket right away instead of waiting on a round trip. The
  // server's own copy of the row wins when it sends one back.
  const markCanceled = useCallback((reservationId, canceledReservation) => {
    setState((current) => ({
      ...current,
      reservations: current.reservations.map((reservation) =>
        reservation.id === reservationId
          ? { ...reservation, ...canceledReservation, status: ReservationApiStatus.CANCELED }
          : reservation,
      ),
    }))
  }, [])

  // Adds a booking the resident just made, so the list reflects it without a
  // refetch; the id guard keeps a concurrent refresh from duplicating the row.
  const addReservation = useCallback((reservation) => {
    if (!reservation?.id) return
    setState((current) => ({
      ...current,
      reservations: [
        ...current.reservations.filter((item) => item.id !== reservation.id),
        reservation,
      ],
    }))
  }, [])

  return { ...state, refresh, markCanceled, addReservation }
}
