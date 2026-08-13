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
  },
  {
    id: 2,
    unit_number: '102',
    title: 'شارژ شهریور',
    status: 'Pending',
    amount: '150000.00',
  },
]

describe('useFinancialReports', () => {
  beforeEach(() => {
    managerChargeApi.financialSummary.mockResolvedValue({
      total_collected_revenue: '100000.00',
      total_outstanding_debt: '150000.00',
    })
    managerChargeApi.search.mockResolvedValue(records)
  })

  it('loads the summary endpoint and charge records', async () => {
    const { result } = renderHook(() => useFinancialReports())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(managerChargeApi.financialSummary).toHaveBeenCalled()
    expect(managerChargeApi.search).toHaveBeenCalled()
    expect(result.current.summary.total_collected_revenue).toBe('100000.00')
    expect(result.current.filteredRecords).toHaveLength(2)
  })

  it('filters records on the client as the search text changes', async () => {
    const { result } = renderHook(() => useFinancialReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSearch('101')
    })

    expect(result.current.filteredRecords).toHaveLength(1)
    expect(result.current.filteredRecords[0].unit_number).toBe('101')
  })
})
