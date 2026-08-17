import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { managerServiceRequestApi } from '../lib/serviceRequestApi'
import { SortOrder, StatusFilter } from '../utils/serviceRequests'
import { useManagerServiceRequests } from './useManagerServiceRequests'

vi.mock('../lib/serviceRequestApi', () => ({
  managerServiceRequestApi: {
    listAll: vi.fn(),
    summary: vi.fn(),
  },
}))

const pending = { id: 1, title: 'نشتی آب', status: 'Pending' }
const assigned = { id: 2, title: 'تعمیر آسانسور', status: 'Assigned' }
const completed = { id: 3, title: 'تعویض لامپ', status: 'Completed' }

describe('useManagerServiceRequests', () => {
  beforeEach(() => {
    managerServiceRequestApi.listAll.mockReset()
    managerServiceRequestApi.summary.mockReset()
    managerServiceRequestApi.listAll.mockResolvedValue({ requests: [pending, assigned, completed] })
    managerServiceRequestApi.summary.mockResolvedValue({ Pending: 1, Assigned: 1, Completed: 1 })
  })

  it('loads the unfiltered list newest-first on mount', async () => {
    const { result } = renderHook(() => useManagerServiceRequests())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(managerServiceRequestApi.listAll).toHaveBeenCalledWith({
      status: '',
      ordering: SortOrder.NEWEST,
    })
    expect(result.current.requests).toHaveLength(3)
    expect(result.current.status).toBe(StatusFilter.ALL)
  })

  it('sends the capitalised ?status= value when a filter is chosen', async () => {
    const { result } = renderHook(() => useManagerServiceRequests())
    await waitFor(() => expect(result.current.loading).toBe(false))

    managerServiceRequestApi.listAll.mockResolvedValue({ requests: [completed] })
    act(() => result.current.setStatus(StatusFilter.COMPLETED))

    await waitFor(() =>
      expect(managerServiceRequestApi.listAll).toHaveBeenLastCalledWith({
        status: 'Completed',
        ordering: SortOrder.NEWEST,
      }),
    )
    await waitFor(() => expect(result.current.requests).toEqual([completed]))
  })

  it('keeps the previous rows visible while the new filter loads', async () => {
    const { result } = renderHook(() => useManagerServiceRequests())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setStatus(StatusFilter.PENDING))

    // The panel must not fall back to the blank first-load state.
    expect(result.current.loading).toBe(false)
    expect(result.current.requests).toHaveLength(3)
    await waitFor(() => expect(result.current.refreshing).toBe(false))
  })

  it('passes the chosen ordering through', async () => {
    const { result } = renderHook(() => useManagerServiceRequests())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setOrdering(SortOrder.OLDEST))

    await waitFor(() =>
      expect(managerServiceRequestApi.listAll).toHaveBeenLastCalledWith({
        status: '',
        ordering: SortOrder.OLDEST,
      }),
    )
  })

  it('reads the per-status totals separately from the filtered list', async () => {
    const { result } = renderHook(() => useManagerServiceRequests())

    await waitFor(() => expect(result.current.summary).toEqual({ Pending: 1, Assigned: 1, Completed: 1 }))

    act(() => result.current.setStatus(StatusFilter.PENDING))
    await waitFor(() => expect(result.current.refreshing).toBe(false))

    // Switching tabs narrows the list but must not re-read or change the totals.
    expect(managerServiceRequestApi.summary).toHaveBeenCalledTimes(1)
    expect(result.current.summary).toEqual({ Pending: 1, Assigned: 1, Completed: 1 })
  })

  it('leaves the panel usable when only the totals fail', async () => {
    managerServiceRequestApi.summary.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useManagerServiceRequests())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.summary).toBeNull()
    expect(result.current.error).toBe('')
    expect(result.current.requests).toHaveLength(3)
  })

  it('re-reads the current filter after an action updates a request', async () => {
    const { result } = renderHook(() => useManagerServiceRequests())
    await waitFor(() => expect(result.current.loading).toBe(false))

    managerServiceRequestApi.listAll.mockResolvedValue({ requests: [pending] })
    act(() => result.current.setStatus(StatusFilter.PENDING))
    await waitFor(() => expect(result.current.requests).toEqual([pending]))

    const callsBefore = managerServiceRequestApi.listAll.mock.calls.length
    // Assigning the pending request moves it out of the "Pending" view.
    managerServiceRequestApi.listAll.mockResolvedValue({ requests: [] })
    act(() => result.current.updateRequest({ ...pending, status: 'Assigned' }))

    await waitFor(() =>
      expect(managerServiceRequestApi.listAll.mock.calls.length).toBe(callsBefore + 1),
    )
    // The re-read still carries the active filter, not a reset to "all".
    expect(managerServiceRequestApi.listAll).toHaveBeenLastCalledWith({
      status: 'Pending',
      ordering: SortOrder.NEWEST,
    })
    await waitFor(() => expect(result.current.requests).toEqual([]))
  })

  it('shows the updated row immediately, before the re-read lands', async () => {
    const { result } = renderHook(() => useManagerServiceRequests())
    await waitFor(() => expect(result.current.loading).toBe(false))

    managerServiceRequestApi.listAll.mockReturnValue(new Promise(() => {}))
    act(() => result.current.updateRequest({ ...assigned, title: 'تعمیر آسانسور (به‌روزشده)' }))

    expect(result.current.requests[1].title).toBe('تعمیر آسانسور (به‌روزشده)')
  })

  it('surfaces a failed load and recovers on refresh', async () => {
    managerServiceRequestApi.listAll
      .mockRejectedValueOnce(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
      .mockResolvedValueOnce({ requests: [pending] })
    const { result } = renderHook(() => useManagerServiceRequests())

    await waitFor(() => expect(result.current.error).toBe('خطایی در ارتباط با سرور رخ داد.'))

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.requests).toEqual([pending]))
    expect(result.current.error).toBe('')
  })
})
