import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { managerServiceRequestApi } from '../lib/serviceRequestApi'
import { useServiceReports } from './useServiceReports'

vi.mock('../lib/serviceRequestApi', () => ({
  managerServiceRequestApi: {
    summary: vi.fn(),
    listAll: vi.fn(),
    search: vi.fn(),
  },
}))

const sampleRequests = [
  {
    id: 1,
    title: 'نشتی آب',
    description: 'لوله زیر سینک چکه می‌کند',
    status: 'Pending',
    unit_number: '101',
    resident: { id: 10, full_name: 'سارا احمدی', phone: '09121111111' },
    assigned_staff: null,
    created_at: '2026-08-10T10:00:00Z',
  },
  {
    id: 2,
    title: 'تعمیر کلید برق',
    description: 'کلید ورودی قطع شده',
    status: 'Assigned',
    unit_number: '102',
    resident: { id: 11, full_name: 'علی رضایی', phone: '09122222222' },
    assigned_staff: { id: 20, full_name: 'متین محمودی', phone: '09123333333' },
    created_at: '2026-08-11T12:00:00Z',
  },
  {
    id: 3,
    title: 'تعمیر قفل درب',
    description: 'قفل گیر کرده است',
    status: 'Completed',
    unit_number: '103',
    resident: { id: 12, full_name: 'مریم حسینی', phone: '09124444444' },
    assigned_staff: { id: 20, full_name: 'متین محمودی', phone: '09123333333' },
    created_at: '2026-08-12T14:00:00Z',
  },
]

describe('useServiceReports', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    managerServiceRequestApi.summary.mockResolvedValue({
      Pending: 1,
      Assigned: 1,
      Completed: 1,
    })
    managerServiceRequestApi.listAll.mockResolvedValue({
      requests: sampleRequests,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('loads the summary metrics and requests list on mount', async () => {
    const { result } = renderHook(() => useServiceReports())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(managerServiceRequestApi.summary).toHaveBeenCalled()
    expect(managerServiceRequestApi.listAll).toHaveBeenCalledWith('')
    expect(result.current.summary.Pending).toBe(1)
    expect(result.current.summary.Assigned).toBe(1)
    expect(result.current.summary.Completed).toBe(1)
    expect(result.current.requests).toHaveLength(3)
  })

  it('debounces search by 300ms before making the API request with the search term', async () => {
    const { result } = renderHook(() => useServiceReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    managerServiceRequestApi.listAll.mockResolvedValue({
      requests: [sampleRequests[0]],
    })

    act(() => {
      result.current.setSearch('101')
    })

    // Before 300ms passes, listAll shouldn't be called with '101' yet
    expect(managerServiceRequestApi.listAll).not.toHaveBeenCalledWith('101')

    // Advance time by 300ms
    act(() => {
      vi.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(managerServiceRequestApi.listAll).toHaveBeenCalledWith('101')
    })

    await waitFor(() => {
      expect(result.current.requests).toHaveLength(1)
      expect(result.current.requests[0].unit_number).toBe('101')
    })
  })

  it('refreshes summary and requests on refresh call', async () => {
    const { result } = renderHook(() => useServiceReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    managerServiceRequestApi.summary.mockResolvedValue({
      Pending: 2,
      Assigned: 1,
      Completed: 1,
    })

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.summary.Pending).toBe(2)
    })
  })

  it('handles API errors gracefully', async () => {
    managerServiceRequestApi.summary.mockRejectedValue(new Error('خطای سرور'))
    const { result } = renderHook(() => useServiceReports())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('خطای سرور')
  })
})
