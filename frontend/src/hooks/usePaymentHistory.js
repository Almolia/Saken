import { useCallback, useEffect, useState } from 'react'
import { residentChargeApi } from '../lib/billingApi'

// Mirrors the tolerance in usePendingCharges so the UI survives a paginated or
// bare-array payload.
function normalizeCharges(data) {
  if (Array.isArray(data?.charges)) return data.charges
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

export function usePaymentHistory() {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({
    charges: [],
    totalPaid: '0',
    loading: true,
    error: '',
  })

  useEffect(() => {
    let active = true

    residentChargeApi
      .history()
      .then((data) => {
        if (!active) return
        setState({
          charges: normalizeCharges(data),
          totalPaid: data?.total_paid ?? '0',
          loading: false,
          error: '',
        })
      })
      .catch((error) => {
        if (!active) return
        setState({
          charges: [],
          totalPaid: '0',
          loading: false,
          error: error.message || 'خطایی در دریافت تاریخچه پرداخت رخ داد.',
        })
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  return { ...state, refresh }
}
