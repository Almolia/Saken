import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { managerChargeApi } from '../lib/billingApi'

function normalizeRecords(data) {
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.charges)) return data.charges
  if (Array.isArray(data)) return data
  return []
}

const STATUS_ALIASES = {
  paid: ['paid', 'پرداخت', 'پرداخت‌شده', 'پرداخت شده', 'تسویه'],
  pending: ['pending', 'بدهی', 'پرداخت‌نشده', 'پرداخت نشده', 'معوق', 'مانده'],
}

function recordMatches(record, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const status = String(record.status || '').toLowerCase()
  const statusHaystack = [
    status,
    ...(STATUS_ALIASES[status] || []),
  ].join(' ')

  const haystack = [
    record.unit_number,
    record.title,
    record.description,
    record.amount,
    record.due_date,
    record.created_at,
    record.floor,
    statusHaystack,
  ]
    .filter((value) => value != null && value !== '')
    .join(' ')
    .toLowerCase()

  return haystack.includes(q)
}

export function useFinancialReports() {
  const hasLoaded = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [state, setState] = useState({
    summary: {
      total_collected_revenue: '0.00',
      total_outstanding_debt: '0.00',
    },
    records: [],
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

    Promise.all([managerChargeApi.financialSummary(), managerChargeApi.search()])
      .then(([summary, records]) => {
        if (!active) return
        hasLoaded.current = true
        setState((current) => ({
          ...current,
          summary: {
            total_collected_revenue: summary?.total_collected_revenue ?? '0.00',
            total_outstanding_debt: summary?.total_outstanding_debt ?? '0.00',
          },
          records: normalizeRecords(records),
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
          error: error.message || 'خطایی در دریافت گزارش مالی رخ داد.',
        }))
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const filteredRecords = useMemo(
    () => state.records.filter((record) => recordMatches(record, search)),
    [state.records, search],
  )

  const refresh = useCallback(() => {
    setReloadKey((current) => current + 1)
  }, [])

  return {
    ...state,
    search,
    setSearch,
    filteredRecords,
    refresh,
  }
}
