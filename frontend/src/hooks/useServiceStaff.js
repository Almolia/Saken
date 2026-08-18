import { useCallback, useEffect, useState } from 'react'
import { managerApi } from '../lib/api'

export function useServiceStaff() {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({
    staff: [],
    loading: true,
    error: '',
  })

  useEffect(() => {
    let active = true

    managerApi
      .serviceStaff()
      .then((data) => {
        if (!active) return
        const staffList = Array.isArray(data?.staff) ? data.staff : []
        setState({ staff: staffList, loading: false, error: '' })
      })
      .catch((error) => {
        if (!active) return
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message || 'خطایی در دریافت لیست کارکنان خدمات رخ داد.',
        }))
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const refresh = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    setReloadKey((current) => current + 1)
  }, [])

  return { ...state, refresh }
}
