import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { residentPollApi } from '../lib/pollApi'
import { useResidentPolls } from './useResidentPolls'

vi.mock('../lib/pollApi', () => ({
  residentPollApi: { list: vi.fn(), vote: vi.fn() },
}))

const closingSoon = {
  id: 2,
  title: 'ساعت تخلیه زباله',
  description: '',
  starts_at: '2026-08-18T09:00:00Z',
  ends_at: '2026-08-25T12:00:00Z',
  options: [
    { id: 3, text: 'ساعت ۸ صبح', position: 0 },
    { id: 4, text: 'ساعت ۸ شب', position: 1 },
  ],
  has_voted: false,
  selected_option_id: null,
}

const closingLater = {
  id: 1,
  title: 'رنگ نمای ساختمان',
  description: 'نما امسال بازسازی می‌شود.',
  starts_at: '2026-08-18T09:00:00Z',
  ends_at: '2026-09-10T12:00:00Z',
  options: [
    { id: 1, text: 'کرم', position: 0 },
    { id: 2, text: 'خاکستری', position: 1 },
  ],
  has_voted: true,
  selected_option_id: 1,
}

describe('useResidentPolls', () => {
  beforeEach(() => {
    residentPollApi.list.mockReset()
    residentPollApi.list.mockResolvedValue({ polls: [closingLater, closingSoon] })
  })

  it('starts in the loading state', () => {
    residentPollApi.list.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useResidentPolls())

    expect(result.current.loading).toBe(true)
    expect(result.current.polls).toEqual([])
  })

  it('reads the polls out of the wrapped response, soonest deadline first', async () => {
    const { result } = renderHook(() => useResidentPolls())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.polls.map((poll) => poll.id)).toEqual([2, 1])
    expect(result.current.error).toBe('')
  })

  it('also accepts a bare array response', async () => {
    residentPollApi.list.mockResolvedValue([closingSoon])
    const { result } = renderHook(() => useResidentPolls())

    await waitFor(() => expect(result.current.polls).toEqual([closingSoon]))
  })

  it('surfaces a failed load and re-reads on refresh', async () => {
    residentPollApi.list
      .mockRejectedValueOnce(new Error('خطایی در ارتباط با سرور رخ داد.'))
      .mockResolvedValueOnce({ polls: [closingSoon] })
    const { result } = renderHook(() => useResidentPolls())

    await waitFor(() => expect(result.current.error).toBe('خطایی در ارتباط با سرور رخ داد.'))

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.polls).toEqual([closingSoon]))
    expect(result.current.error).toBe('')
  })

  it('keeps the cards on screen while a refresh is in flight', async () => {
    const { result } = renderHook(() => useResidentPolls())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let resolveSecond
    residentPollApi.list.mockReturnValue(
      new Promise((resolve) => {
        resolveSecond = resolve
      }),
    )
    act(() => result.current.refresh())

    expect(result.current.refreshing).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(result.current.polls).toHaveLength(2)

    await act(async () => resolveSecond({ polls: [closingSoon] }))
    await waitFor(() => expect(result.current.refreshing).toBe(false))
  })

  it('counts only the polls still waiting for a vote', async () => {
    const { result } = renderHook(() => useResidentPolls())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.pendingCount).toBe(1)
  })

  it('records an accepted vote on the card without refetching', async () => {
    const { result } = renderHook(() => useResidentPolls())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.markVoted(2, 4))

    const voted = result.current.polls.find((poll) => poll.id === 2)
    expect(voted.has_voted).toBe(true)
    expect(voted.selected_option_id).toBe(4)
    expect(result.current.pendingCount).toBe(0)
    expect(residentPollApi.list).toHaveBeenCalledTimes(1)
  })

  it('leaves the other polls untouched when one is voted on', async () => {
    const { result } = renderHook(() => useResidentPolls())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.markVoted(2, 3))

    expect(result.current.polls.find((poll) => poll.id === 1)).toEqual(closingLater)
  })

  it('ignores a vote recorded against a poll that is no longer listed', async () => {
    const { result } = renderHook(() => useResidentPolls())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.markVoted(999, 1))

    expect(result.current.polls.map((poll) => poll.has_voted)).toEqual([false, true])
  })
})
