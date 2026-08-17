import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAnnouncements } from './useAnnouncements'

const announcement = {
  id: 1,
  title: 'قطع آب ساختمان',
  content: 'آب ساختمان فردا از ساعت ۹ تا ۱۲ قطع خواهد بود.',
  author_name: 'مدیر ساختمان',
  created_at: '2026-08-16T09:00:00Z',
}

describe('useAnnouncements', () => {
  it('starts in the loading state', () => {
    const fetchAnnouncements = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useAnnouncements(fetchAnnouncements))

    expect(result.current.loading).toBe(true)
    expect(result.current.announcements).toEqual([])
  })

  it('reads the bare array the endpoint returns', async () => {
    const fetchAnnouncements = vi.fn().mockResolvedValue([announcement])
    const { result } = renderHook(() => useAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.announcements).toEqual([announcement])
    expect(result.current.error).toBe('')
  })

  it('also copes with a paginated or wrapped response', async () => {
    const wrapped = vi.fn().mockResolvedValue({ results: [announcement] })
    const { result: fromResults } = renderHook(() => useAnnouncements(wrapped))
    await waitFor(() => expect(fromResults.current.announcements).toEqual([announcement]))

    const keyed = vi.fn().mockResolvedValue({ announcements: [announcement] })
    const { result: fromKey } = renderHook(() => useAnnouncements(keyed))
    await waitFor(() => expect(fromKey.current.announcements).toEqual([announcement]))
  })

  it('falls back to an empty feed when the payload is not a list', async () => {
    const fetchAnnouncements = vi.fn().mockResolvedValue(null)
    const { result } = renderHook(() => useAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.announcements).toEqual([])
    expect(result.current.error).toBe('')
  })

  it('surfaces a failed load', async () => {
    const fetchAnnouncements = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
    const { result } = renderHook(() => useAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('خطایی در ارتباط با سرور رخ داد.')
  })

  it('refreshes without falling back to the first-load spinner', async () => {
    const second = { ...announcement, id: 2, title: 'جلسه هیئت مدیره' }
    const fetchAnnouncements = vi
      .fn()
      .mockResolvedValueOnce([announcement])
      .mockResolvedValueOnce([second, announcement])
    const { result } = renderHook(() => useAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.refresh())
    // The already-visible feed stays put; only the refresh indicator moves.
    expect(result.current.loading).toBe(false)

    await waitFor(() => expect(result.current.announcements).toHaveLength(2))
    expect(result.current.refreshing).toBe(false)
  })

  it('recovers from an error when the retry succeeds', async () => {
    const fetchAnnouncements = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))
      .mockResolvedValueOnce([announcement])
    const { result } = renderHook(() => useAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.error).toBe('boom'))

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.announcements).toEqual([announcement]))
    expect(result.current.error).toBe('')
  })
})
