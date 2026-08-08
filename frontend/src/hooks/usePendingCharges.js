import { useCallback, useEffect, useRef, useState } from 'react'
import { residentChargeApi } from '../lib/billingApi'

// The endpoint returns { charges: [...] }; keep the same tolerance used by the
// manager charges hook so the UI stays resilient to paginated or bare-array
// payloads.
function normalizeCharges(data) {
  if (Array.isArray(data?.charges)) return data.charges
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

export function usePendingCharges() {
  const hasLoaded = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({
    charges: [],
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

    residentChargeApi
      .pending()
      .then((data) => {
        if (!active) return
        hasLoaded.current = true
        setState({
          charges: normalizeCharges(data),
          loading: false,
          refreshing: false,
          error: '',
        })
      })
      .catch((error) => {
        if (!active) return
        setState({
          charges: [],
          loading: false,
          refreshing: false,
          error: error.message || 'خطایی در دریافت شارژهای پرداخت‌نشده رخ داد.',
        })
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  // Drops charges the server has just marked paid, so the list updates the
  // moment the payment succeeds instead of waiting on a round trip.
  const removeCharges = useCallback((chargeIds) => {
    const removed = new Set(chargeIds)
    setState((current) => ({
      ...current,
      charges: current.charges.filter((charge) => !removed.has(charge.id)),
    }))
  }, [])

  return { ...state, refresh, removeCharges }
}
