import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { managerApi } from '../lib/api'
import { managerPollApi } from '../lib/pollApi'
import { useManagerPolls } from './useManagerPolls'

vi.mock('../lib/api', () => ({
  managerApi: { units: vi.fn() },
}))

vi.mock('../lib/pollApi', () => ({
  managerPollApi: { list: vi.fn() },
}))

const draft = {
  id: 1,
  title: 'رنگ نمای ساختمان',
  description: 'نما امسال بازسازی می‌شود.',
  status: 'Draft',
  starts_at: null,
  ends_at: '2026-09-01T12:00:00Z',
  target_units: [],
  options: [
    { id: 1, text: 'کرم', position: 0 },
    { id: 2, text: 'خاکستری', position: 1 },
  ],
  created_at: '2026-08-10T09:00:00Z',
}

const active = {
  id: 2,
  title: 'ساعت تخلیه زباله',
  description: '',
  status: 'Active',
  starts_at: '2026-08-18T09:00:00Z',
  ends_at: '2026-09-05T12:00:00Z',
  target_units: [7],
  options: [
    { id: 3, text: 'ساعت ۸', position: 0 },
    { id: 4, text: 'ساعت ۲۰', position: 1 },
  ],
  created_at: '2026-08-18T09:00:00Z',
}

const units = [
  { id: 7, unit_number: '101', floor: 1 },
  { id: 8, unit_number: '102', floor: 1 },
]

describe('useManagerPolls', () => {
  beforeEach(() => {
    managerPollApi.list.mockReset()
    managerPollApi.list.mockResolvedValue({ polls: [draft, active] })
    managerApi.units.mockReset()
    managerApi.units.mockResolvedValue({ units })
  })

  it('starts in the loading state', () => {
    managerPollApi.list.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useManagerPolls())

    expect(result.current.loading).toBe(true)
    expect(result.current.polls).toEqual([])
  })

  it('reads the list newest-first out of the wrapped response', async () => {
    const { result } = renderHook(() => useManagerPolls())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.polls.map((poll) => poll.id)).toEqual([2, 1])
    expect(result.current.error).toBe('')
  })

  it('also accepts a bare array response', async () => {
    managerPollApi.list.mockResolvedValue([draft])
    const { result } = renderHook(() => useManagerPolls())

    await waitFor(() => expect(result.current.polls).toEqual([draft]))
  })

  it('loads the unit directory alongside the polls', async () => {
    const { result } = renderHook(() => useManagerPolls())

    await waitFor(() => expect(result.current.units).toEqual(units))
    expect(result.current.unitsError).toBe('')
  })

  it('keeps the list usable when only the unit directory fails', async () => {
    managerApi.units.mockRejectedValue(new Error('خطایی در دریافت فهرست واحدها رخ داد.'))
    const { result } = renderHook(() => useManagerPolls())

    await waitFor(() => expect(result.current.unitsError).toBe('خطایی در دریافت فهرست واحدها رخ داد.'))
    expect(result.current.polls).toHaveLength(2)
    expect(result.current.error).toBe('')
  })

  it('surfaces a failed load and re-reads on refresh', async () => {
    managerPollApi.list
      .mockRejectedValueOnce(new Error('خطایی در ارتباط با سرور رخ داد.'))
      .mockResolvedValueOnce({ polls: [draft] })
    const { result } = renderHook(() => useManagerPolls())

    await waitFor(() => expect(result.current.error).toBe('خطایی در ارتباط با سرور رخ داد.'))

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.polls).toEqual([draft]))
    expect(result.current.error).toBe('')
  })

  it('counts every status for the summary cards', async () => {
    const { result } = renderHook(() => useManagerPolls())

    await waitFor(() => expect(result.current.summary.total).toBe(2))
    expect(result.current.summary).toEqual({ total: 2, draft: 1, active: 1, closed: 0 })
  })

  it('narrows the visible list by status without touching the summary', async () => {
    const { result } = renderHook(() => useManagerPolls())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setStatus('draft'))

    expect(result.current.visiblePolls.map((poll) => poll.id)).toEqual([1])
    expect(result.current.summary.total).toBe(2)
    expect(result.current.hasFilters).toBe(true)
  })

  it('searches the title and the option texts', async () => {
    const { result } = renderHook(() => useManagerPolls())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setSearch('خاکستری'))
    expect(result.current.visiblePolls.map((poll) => poll.id)).toEqual([1])

    act(() => result.current.clearFilters())
    expect(result.current.visiblePolls).toHaveLength(2)
    expect(result.current.hasFilters).toBe(false)
  })

  it('puts a newly created poll at the top without refetching', async () => {
    const { result } = renderHook(() => useManagerPolls())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const created = { ...draft, id: 3, title: 'نظرسنجی تازه', created_at: '2026-08-20T09:00:00Z' }
    act(() => result.current.addPoll(created))

    expect(result.current.polls.map((poll) => poll.id)).toEqual([3, 2, 1])
    expect(managerPollApi.list).toHaveBeenCalledTimes(1)
  })

  it('does not show the same poll twice when a create is retried', async () => {
    const { result } = renderHook(() => useManagerPolls())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.addPoll({ ...active, title: 'همان نظرسنجی' }))

    expect(result.current.polls).toHaveLength(2)
    expect(result.current.polls[0].title).toBe('همان نظرسنجی')
  })

  it('keeps a published poll in place when it is replaced', async () => {
    const { result } = renderHook(() => useManagerPolls())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.replacePoll({ ...draft, status: 'Active' }))

    expect(result.current.polls.map((poll) => poll.id)).toEqual([2, 1])
    expect(result.current.polls[1].status).toBe('Active')
    expect(result.current.summary).toEqual({ total: 2, draft: 0, active: 2, closed: 0 })
  })

  it('drops a deleted draft from the list', async () => {
    const { result } = renderHook(() => useManagerPolls())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.removePoll(1))

    expect(result.current.polls.map((poll) => poll.id)).toEqual([2])
  })
})
