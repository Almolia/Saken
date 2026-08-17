import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useManagerAnnouncements } from './useManagerAnnouncements'

const newer = {
  id: 2,
  title: 'قطع آب',
  content: 'آب ساختمان فردا از ساعت ۹ تا ۱۲ قطع می‌شود.',
  author_name: 'مدیر ساختمان',
  is_active: true,
  created_at: '2026-08-16T09:00:00Z',
  updated_at: '2026-08-16T09:00:00Z',
}

const older = {
  id: 1,
  title: 'جلسه ساختمان',
  content: 'جلسه هیئت مدیره پنج‌شنبه برگزار می‌شود.',
  author_name: 'مدیر ساختمان',
  is_active: false,
  created_at: '2026-08-10T09:00:00Z',
  updated_at: '2026-08-10T09:00:00Z',
}

describe('useManagerAnnouncements', () => {
  it('starts in the loading state', () => {
    const fetchAnnouncements = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useManagerAnnouncements(fetchAnnouncements))

    expect(result.current.loading).toBe(true)
    expect(result.current.announcements).toEqual([])
  })

  it('reads the list out of the wrapped response', async () => {
    const fetchAnnouncements = vi.fn().mockResolvedValue({ announcements: [newer, older] })
    const { result } = renderHook(() => useManagerAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.announcements).toEqual([newer, older])
    expect(result.current.error).toBe('')
  })

  it('also accepts a bare array response', async () => {
    const fetchAnnouncements = vi.fn().mockResolvedValue([newer])
    const { result } = renderHook(() => useManagerAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.announcements).toEqual([newer]))
  })

  it('surfaces a failed load and re-reads on retry', async () => {
    const fetchAnnouncements = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
      .mockResolvedValueOnce({ announcements: [newer] })
    const { result } = renderHook(() => useManagerAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.error).toBe('خطایی در ارتباط با سرور رخ داد.'))

    act(() => result.current.retry())
    await waitFor(() => expect(result.current.announcements).toEqual([newer]))
    expect(result.current.error).toBe('')
  })

  it('prepends a newly published announcement without refetching', async () => {
    const fetchAnnouncements = vi.fn().mockResolvedValue({ announcements: [older] })
    const { result } = renderHook(() => useManagerAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.addAnnouncement(newer))

    expect(result.current.announcements.map((item) => item.id)).toEqual([2, 1])
    expect(fetchAnnouncements).toHaveBeenCalledTimes(1)
  })

  it('does not list the same announcement twice', async () => {
    const fetchAnnouncements = vi.fn().mockResolvedValue({ announcements: [newer, older] })
    const { result } = renderHook(() => useManagerAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.addAnnouncement(newer))

    expect(result.current.announcements.map((item) => item.id)).toEqual([2, 1])
  })

  it('swaps an edited announcement in place, keeping the order', async () => {
    const fetchAnnouncements = vi.fn().mockResolvedValue({ announcements: [newer, older] })
    const { result } = renderHook(() => useManagerAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.replaceAnnouncement({ ...older, title: 'جلسه ساختمان (به‌روزشده)' }))

    expect(result.current.announcements.map((item) => item.id)).toEqual([2, 1])
    expect(result.current.announcements[1].title).toBe('جلسه ساختمان (به‌روزشده)')
  })

  it('drops a deleted announcement from the list', async () => {
    const fetchAnnouncements = vi.fn().mockResolvedValue({ announcements: [newer, older] })
    const { result } = renderHook(() => useManagerAnnouncements(fetchAnnouncements))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.removeAnnouncement(2))

    expect(result.current.announcements).toEqual([older])
  })
})
