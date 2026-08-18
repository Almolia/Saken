import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { managerServiceRequestApi } from '../lib/serviceRequestApi'
import { useServiceReports } from './useServiceReports'

vi.mock('../lib/serviceRequestApi', () => ({
  managerServiceRequestApi: {
    summary: vi.fn(),
    listAll: vi.fn(),
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

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('useServiceReports', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
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
  })

  it('loads live summary metrics and the complete requests list on mount', async () => {
    const { result } = renderHook(() => useServiceReports())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(managerServiceRequestApi.summary).toHaveBeenCalledTimes(1)
    expect(managerServiceRequestApi.listAll).toHaveBeenCalledWith({ search: '' })
    expect(result.current.summary.Pending).toBe(1)
    expect(result.current.summary.Assigned).toBe(1)
    expect(result.current.summary.Completed).toBe(1)
    expect(result.current.requests).toHaveLength(3)
  })

  it('debounces search by 300ms and does not refetch unfiltered summary counts', async () => {
    const { result } = renderHook(() => useServiceReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    managerServiceRequestApi.listAll.mockResolvedValue({
      requests: [sampleRequests[0]],
    })

    act(() => {
      result.current.setSearch('101')
    })

    expect(result.current.isDebouncing).toBe(true)
    expect(managerServiceRequestApi.listAll).not.toHaveBeenCalledWith({ search: '101' })

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(managerServiceRequestApi.listAll).not.toHaveBeenCalledWith({ search: '101' })

    act(() => {
      vi.advanceTimersByTime(1)
    })

    await waitFor(() => {
      expect(managerServiceRequestApi.listAll).toHaveBeenCalledWith({ search: '101' })
      expect(result.current.requests).toEqual([sampleRequests[0]])
    })
    expect(managerServiceRequestApi.summary).toHaveBeenCalledTimes(1)
  })

  it('turns Persian status labels and Jalali dates into typed filters', async () => {
    const { result } = renderHook(() => useServiceReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setSearch('در انتظار بررسی'))
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() =>
      expect(managerServiceRequestApi.listAll).toHaveBeenCalledWith({ status: 'در انتظار بررسی' }),
    )

    act(() => result.current.setSearch('۱۴۰۵/۰۵/۲۷'))
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() =>
      expect(managerServiceRequestApi.listAll).toHaveBeenCalledWith({
        createdAfter: '۱۴۰۵/۰۵/۲۷',
        createdBefore: '۱۴۰۵/۰۵/۲۷',
      }),
    )
  })

  it('keeps the newest result when an older search response arrives late', async () => {
    const { result } = renderHook(() => useServiceReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const firstSearch = deferred()
    const secondSearch = deferred()
    managerServiceRequestApi.listAll.mockImplementation((query) => {
      if (query.search === 'اول') return firstSearch.promise
      if (query.search === 'دوم') return secondSearch.promise
      return Promise.resolve({ requests: sampleRequests })
    })

    act(() => result.current.setSearch('اول'))
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() => expect(managerServiceRequestApi.listAll).toHaveBeenCalledWith({ search: 'اول' }))

    act(() => result.current.setSearch('دوم'))
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() => expect(managerServiceRequestApi.listAll).toHaveBeenCalledWith({ search: 'دوم' }))

    await act(async () => {
      secondSearch.resolve({ requests: [sampleRequests[1]] })
    })
    await waitFor(() => expect(result.current.requests[0].id).toBe(2))

    await act(async () => {
      firstSearch.resolve({ requests: [sampleRequests[0]] })
    })
    expect(result.current.requests[0].id).toBe(2)
  })

  it('refreshes both summary and requests without clearing existing rows', async () => {
    const { result } = renderHook(() => useServiceReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const refreshList = deferred()
    managerServiceRequestApi.listAll.mockReturnValueOnce(refreshList.promise)
    managerServiceRequestApi.summary.mockResolvedValue({
      Pending: 2,
      Assigned: 1,
      Completed: 1,
    })

    act(() => {
      result.current.refresh()
    })

    expect(result.current.refreshing).toBe(true)
    expect(result.current.requests).toHaveLength(3)

    await act(async () => {
      refreshList.resolve({ requests: sampleRequests })
    })
    await waitFor(() => expect(result.current.summary.Pending).toBe(2))
    expect(managerServiceRequestApi.summary).toHaveBeenCalledTimes(2)
  })

  it('reports a summary failure without discarding a successful table response', async () => {
    managerServiceRequestApi.summary.mockRejectedValue(new Error('خطای آمار'))
    const { result } = renderHook(() => useServiceReports())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.summaryError).toBe('خطای آمار')
    expect(result.current.error).toBe('')
    expect(result.current.requests).toHaveLength(3)
  })

  it('reports a list failure and keeps previously loaded rows visible', async () => {
    const { result } = renderHook(() => useServiceReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    managerServiceRequestApi.listAll.mockRejectedValue(new Error('خطای جستجو'))
    act(() => result.current.setSearch('ناموجود'))
    act(() => vi.advanceTimersByTime(300))

    await waitFor(() => expect(result.current.error).toBe('خطای جستجو'))
    expect(result.current.requests).toHaveLength(3)
  })
})
