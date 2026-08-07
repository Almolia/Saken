import { useCallback, useEffect, useRef, useState } from 'react'
import { managerChargeApi } from '../lib/billingApi'

function normalizeCharges(data) {
  if (Array.isArray(data?.charges)) return data.charges
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data)) return data
  return []
}

export function useManagerCharges() {
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

    managerChargeApi
      .list()
      .then((data) => {
        if (!active) return
        hasLoaded.current = true
        setState((current) => ({
          ...current,
          charges: normalizeCharges(data),
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
          error: error.message || 'خطایی در دریافت تاریخچه شارژها رخ داد.',
        }))
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  const addCharge = useCallback((newCharge) => {
    setState((current) => ({
      ...current,
      charges: [
        newCharge,
        ...current.charges.filter((item) => item.id !== newCharge.id),
      ],
    }))
  }, [])

  return { ...state, refresh, addCharge }
}
