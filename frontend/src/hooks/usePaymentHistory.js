import { useCallback, useEffect, useRef, useState } from 'react'
import { residentChargeApi } from '../lib/billingApi'
import { sortPayments } from '../utils/payments'

// Mirrors the tolerance in usePendingCharges so the UI survives a paginated or
// bare-array payload.
function normalizeCharges(data) {
  if (Array.isArray(data?.charges)) return data.charges
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

/**
 * The resident's settled charges, newest payment first.
 *
 * `enabled` defers the request until the payment-history view is actually
 * opened, so a resident who never visits the tab never pays for the call. It
 * latches on: once the history has been read it keeps refreshing after a
 * payment even while another tab is on screen, and re-opening the tab does not
 * blank a list that is already loaded.
 */
export function usePaymentHistory({ enabled = true } = {}) {
  const [started, setStarted] = useState(enabled)
  const hasLoaded = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({
    charges: [],
    totalPaid: '0',
    loading: true,
    refreshing: false,
    error: '',
  })

  useEffect(() => {
    if (enabled) setStarted(true)
  }, [enabled])

  useEffect(() => {
    if (!started) return undefined

    let active = true
    // Only the first read blanks the panel. A refresh after a payment keeps
    // the settled rows on screen and shows the lighter treatment instead.
    const isInitialLoad = !hasLoaded.current
    setState((current) => ({
      ...current,
      loading: isInitialLoad,
      refreshing: !isInitialLoad,
    }))

    residentChargeApi
      .history()
      .then((data) => {
        if (!active) return
        hasLoaded.current = true
        setState({
          // The endpoint already orders by payment date, but sorting here
          // makes "most recent first" a property of the view rather than a
          // promise about the payload.
          charges: sortPayments(normalizeCharges(data)),
          totalPaid: data?.total_paid ?? '0',
          loading: false,
          refreshing: false,
          error: '',
        })
      })
      .catch((error) => {
        if (!active) return
        setState({
          charges: [],
          totalPaid: '0',
          loading: false,
          refreshing: false,
          error: error.message || 'خطایی در دریافت تاریخچه پرداخت رخ داد.',
        })
      })

    return () => {
      active = false
    }
  }, [started, reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  return { ...state, refresh }
}
