import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { managerChargeApi } from '../lib/billingApi'
import { useFinancialReports } from './useFinancialReports'

vi.mock('../lib/billingApi', () => ({
  managerChargeApi: {
    financialSummary: vi.fn(),
    search: vi.fn(),
  },
}))

const records = [
  {
    id: 1,
    unit_number: '101',
    title: 'شارژ مهرماه',
    status: 'Paid',
    amount: '100000.00',
    due_date: '2026-10-20',
  },
  {
    id: 2,
    unit_number: '102',
    title: 'شارژ شهریور',
    status: 'Pending',
    amount: '150000.00',
    due_date: '2026-09-20',
  },
]

describe('useFinancialReports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    managerChargeApi.financialSummary.mockResolvedValue({
      total_collected_revenue: '100000.00',
      total_outstanding_debt: '150000.00',
    })
    managerChargeApi.search.mockResolvedValue(records)
  })

  it('loads the summary endpoint and complete charge ledger', async () => {
    const { result } = renderHook(() => useFinancialReports())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(managerChargeApi.financialSummary).toHaveBeenCalledTimes(1)
    expect(managerChargeApi.search).toHaveBeenCalledWith()
    expect(result.current.summary.total_collected_revenue).toBe('100000.00')
    expect(result.current.filteredRecords).toHaveLength(2)
  })

  it('also accepts a paginated results envelope without emptying the table', async () => {
    managerChargeApi.search.mockResolvedValue({ count: records.length, results: records })

    const { result } = renderHook(() => useFinancialReports())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.filteredRecords).toEqual(records)
  })

  it('filters records instantly across all displayed columns', async () => {
    const { result } = renderHook(() => useFinancialReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSearch('150000')
    })

    expect(result.current.filteredRecords).toHaveLength(1)
    expect(result.current.filteredRecords[0].unit_number).toBe('102')
  })

  it('normalizes Persian digits and lets words match different columns', async () => {
    const { result } = renderHook(() => useFinancialReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSearch('واحد ۱۰۱ پرداخت شده')
    })

    expect(result.current.filteredRecords).toHaveLength(1)
    expect(result.current.filteredRecords[0].id).toBe(1)
  })

  it('can clear the unified search field', async () => {
    const { result } = renderHook(() => useFinancialReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setSearch('101'))
    expect(result.current.filteredRecords).toHaveLength(1)

    act(() => result.current.clearSearch())
    expect(result.current.search).toBe('')
    expect(result.current.filteredRecords).toHaveLength(2)
  })
})
