import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { managerAmenityApi } from '../lib/amenityApi'
import { useAmenityReports } from './useAmenityReports'

vi.mock('../lib/amenityApi', () => ({
  managerAmenityApi: {
    reservations: vi.fn(),
    amenities: vi.fn(),
  },
}))

const poolBooking = {
  id: 1,
  amenity: 1,
  amenity_name: 'استخر',
  resident: 10,
  resident_name: 'سارا احمدی',
  start_time: '2026-08-10T08:00:00Z',
  end_time: '2026-08-10T09:00:00Z',
  status: 'Active',
  created_at: '2026-08-01T10:00:00Z',
}

const gymBooking = {
  id: 2,
  amenity: 2,
  amenity_name: 'باشگاه ورزشی',
  resident: 11,
  resident_name: 'علی رضایی',
  start_time: '2026-09-10T08:00:00Z',
  end_time: '2026-09-10T09:00:00Z',
  status: 'Canceled',
  created_at: '2026-08-02T10:00:00Z',
}

const lastSearch = () => managerAmenityApi.reservations.mock.calls.at(-1)[0]

describe('useAmenityReports', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    managerAmenityApi.reservations.mockResolvedValue({
      reservations: [poolBooking, gymBooking],
    })
    managerAmenityApi.amenities.mockResolvedValue({
      amenities: [{ id: 1, name: 'استخر' }, { id: 2, name: 'باشگاه ورزشی' }],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads the whole log and the amenity options on mount', async () => {
    const { result } = renderHook(() => useAmenityReports())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(lastSearch()).toEqual({ search: '', amenity: '', date: '' })
    expect(result.current.reservations).toHaveLength(2)
    expect(result.current.amenities).toHaveLength(2)
    expect(result.current.error).toBe('')
  })

  it('shows the most recent booking first', async () => {
    const { result } = renderHook(() => useAmenityReports())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations.map((item) => item.id)).toEqual([2, 1])
  })

  it('counts what the table is currently showing', async () => {
    const { result } = renderHook(() => useAmenityReports())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.summary).toEqual({ total: 2, active: 1, canceled: 1 })
  })

  it('debounces the search by 300ms and sends it to the endpoint', async () => {
    const { result } = renderHook(() => useAmenityReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    managerAmenityApi.reservations.mockResolvedValue({ reservations: [poolBooking] })

    act(() => result.current.setSearch('استخر'))
    expect(result.current.isDebouncing).toBe(true)

    act(() => vi.advanceTimersByTime(299))
    expect(lastSearch().search).toBe('')

    act(() => vi.advanceTimersByTime(1))
    await waitFor(() => expect(lastSearch().search).toBe('استخر'))
    await waitFor(() => expect(result.current.reservations).toEqual([poolBooking]))
  })

  it('collapses a burst of keystrokes into a single request', async () => {
    const { result } = renderHook(() => useAmenityReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const callsBefore = managerAmenityApi.reservations.mock.calls.length

    act(() => result.current.setSearch('اس'))
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.setSearch('است'))
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.setSearch('استخر'))
    act(() => vi.advanceTimersByTime(300))

    await waitFor(() => expect(lastSearch().search).toBe('استخر'))
    expect(managerAmenityApi.reservations.mock.calls.length).toBe(callsBefore + 1)
  })

  it('sends the stored status value when the manager types the Persian label', async () => {
    const { result } = renderHook(() => useAmenityReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setSearch('لغو شده'))
    act(() => vi.advanceTimersByTime(300))

    await waitFor(() => expect(lastSearch().search).toBe('Canceled'))
  })

  it('keeps the amenity and date filters alongside the search', async () => {
    const { result } = renderHook(() => useAmenityReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setAmenity('2'))
    await waitFor(() => expect(lastSearch()).toEqual({ search: '', amenity: '2', date: '' }))

    act(() => result.current.setDate('2026-09-10'))
    await waitFor(() =>
      expect(lastSearch()).toEqual({ search: '', amenity: '2', date: '2026-09-10' }),
    )

    act(() => result.current.setSearch('علی'))
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() =>
      expect(lastSearch()).toEqual({ search: 'علی', amenity: '2', date: '2026-09-10' }),
    )
    expect(result.current.hasFilters).toBe(true)
  })

  it('clears every filter at once', async () => {
    const { result } = renderHook(() => useAmenityReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSearch('استخر')
      result.current.setAmenity('1')
      result.current.setDate('2026-08-10')
    })
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() => expect(result.current.hasFilters).toBe(true))

    act(() => result.current.clearFilters())
    act(() => vi.advanceTimersByTime(300))

    await waitFor(() => expect(lastSearch()).toEqual({ search: '', amenity: '', date: '' }))
    expect(result.current.hasFilters).toBe(false)
  })

  it('keeps the previous rows on screen while a search is in flight', async () => {
    const { result } = renderHook(() => useAmenityReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let resolveSearch
    managerAmenityApi.reservations.mockReturnValueOnce(
      new Promise((resolve) => { resolveSearch = resolve }),
    )

    act(() => result.current.setSearch('استخر'))
    act(() => vi.advanceTimersByTime(300))

    await waitFor(() => expect(result.current.searching).toBe(true))
    expect(result.current.loading).toBe(false)
    expect(result.current.reservations).toHaveLength(2)

    await act(async () => resolveSearch({ reservations: [poolBooking] }))
    await waitFor(() => expect(result.current.reservations).toEqual([poolBooking]))
    expect(result.current.searching).toBe(false)
  })

  it('does not re-read the amenity options on every keystroke', async () => {
    const { result } = renderHook(() => useAmenityReports())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(managerAmenityApi.amenities).toHaveBeenCalledTimes(1)

    act(() => result.current.setSearch('استخر'))
    act(() => vi.advanceTimersByTime(300))
    await waitFor(() => expect(lastSearch().search).toBe('استخر'))

    expect(managerAmenityApi.amenities).toHaveBeenCalledTimes(1)

    act(() => result.current.refresh())
    await waitFor(() => expect(managerAmenityApi.amenities).toHaveBeenCalledTimes(2))
  })

  it('surfaces the report error and keeps the rows it already had', async () => {
    const { result } = renderHook(() => useAmenityReports())
    await waitFor(() => expect(result.current.loading).toBe(false))

    managerAmenityApi.reservations.mockRejectedValueOnce(new Error('خطای سرور'))
    act(() => result.current.refresh())

    await waitFor(() => expect(result.current.error).toBe('خطای سرور'))
    expect(result.current.reservations).toHaveLength(2)
    expect(result.current.loading).toBe(false)
  })

  it('falls back to a readable message when the failure carries none', async () => {
    managerAmenityApi.reservations.mockRejectedValueOnce(new Error(''))
    const { result } = renderHook(() => useAmenityReports())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('خطایی در دریافت گزارش رزروها رخ داد.')
  })

  it('reports a broken amenity dropdown without failing the whole report', async () => {
    managerAmenityApi.amenities.mockRejectedValueOnce(new Error('امکانات در دسترس نیست'))
    const { result } = renderHook(() => useAmenityReports())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.amenitiesError).toBe('امکانات در دسترس نیست')
    expect(result.current.reservations).toHaveLength(2)
    expect(result.current.error).toBe('')
  })

  it('normalizes a bare-array payload', async () => {
    managerAmenityApi.reservations.mockResolvedValue([poolBooking])
    const { result } = renderHook(() => useAmenityReports())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations).toEqual([poolBooking])
  })
})
