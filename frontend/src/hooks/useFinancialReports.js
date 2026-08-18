import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { managerChargeApi } from '../lib/billingApi'

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

const STATUS_ALIASES = {
  paid: ['paid', 'پرداخت', 'پرداخت‌شده', 'پرداخت شده', 'تسویه', 'تسویه‌شده'],
  pending: ['pending', 'بدهی', 'پرداخت‌نشده', 'پرداخت نشده', 'معوق', 'مانده'],
}

// The backend contract is a bare array today. Envelope support is intentional
// defensive compatibility so enabling DRF pagination cannot silently blank the
// report before the frontend and backend are deployed together.
function normalizeRecords(data) {
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.charges)) return data.charges
  if (Array.isArray(data)) return data
  return []
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .toLocaleLowerCase('fa-IR')
    .replace(/\s+/g, ' ')
    .trim()
}

function recordMatches(record, query) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true

  const normalizedStatus = String(record.status || '').toLowerCase()
  const statusTerms = [
    normalizedStatus,
    ...(STATUS_ALIASES[normalizedStatus] || []),
  ]

  const searchableText = normalizeSearchText([
    record.unit_number ? `واحد ${record.unit_number}` : '',
    record.title,
    record.description,
    record.amount,
    record.due_date,
    record.created_at,
    record.floor,
    ...statusTerms,
  ]
    .filter((value) => value != null && value !== '')
    .join(' '))

  // A multi-word query should work even when its words match different table
  // columns (for example "۱۰۱ پرداخت شده"). Matching the complete phrase first
  // also preserves natural searches containing spaces.
  return (
    searchableText.includes(normalizedQuery)
    || normalizedQuery.split(' ').every((term) => searchableText.includes(term))
  )
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

    Promise.all([
      managerChargeApi.financialSummary(),
      managerChargeApi.search(),
    ])
      .then(([summary, records]) => {
        if (!active) return

        hasLoaded.current = true
        setState({
          summary: {
            total_collected_revenue: summary?.total_collected_revenue ?? '0.00',
            total_outstanding_debt: summary?.total_outstanding_debt ?? '0.00',
          },
          records: normalizeRecords(records),
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
          error: error.message || 'خطایی در دریافت گزارش مالی رخ داد.',
        }))
      })

    return () => {
      // Ignore a response from an obsolete refresh or an unmounted report.
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

  const clearSearch = useCallback(() => {
    setSearch('')
  }, [])

  return {
    ...state,
    search,
    setSearch,
    clearSearch,
    filteredRecords,
    refresh,
  }
}
