import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useMyReservations } from './useMyReservations'

vi.mock('../lib/amenityApi', () => ({
  amenityApi: {
    myReservations: vi.fn(),
  },
}))

import { amenityApi } from '../lib/amenityApi'

const sampleReservation = {
  id: 5,
  amenity: 1,
  amenity_name: 'باشگاه ورزشی',
  start_time: '2026-09-01T08:00:00Z',
  end_time: '2026-09-01T09:00:00Z',
  status: 'Active',
}

describe('useMyReservations', () => {
  it('starts in the loading state', () => {
    amenityApi.myReservations.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useMyReservations())

    expect(result.current.loading).toBe(true)
    expect(result.current.reservations).toEqual([])
    expect(result.current.error).toBe('')
  })

  it('exposes the resident bookings after a successful fetch', async () => {
    amenityApi.myReservations.mockResolvedValue({ reservations: [sampleReservation] })
    const { result } = renderHook(() => useMyReservations())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations).toEqual([sampleReservation])
    expect(result.current.error).toBe('')
  })

  it('normalizes a bare-array response', async () => {
    amenityApi.myReservations.mockResolvedValue([sampleReservation])
    const { result } = renderHook(() => useMyReservations())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations).toEqual([sampleReservation])
  })

  it('exposes the error message when the fetch fails', async () => {
    amenityApi.myReservations.mockRejectedValue(
      Object.assign(new Error('خطایی در دریافت رزروهای شما رخ داد.'), { status: 500 }),
    )
    const { result } = renderHook(() => useMyReservations())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations).toEqual([])
    expect(result.current.error).toBe('خطایی در دریافت رزروهای شما رخ داد.')
  })

  it('refreshes the list when refresh is called', async () => {
    amenityApi.myReservations
      .mockResolvedValueOnce({ reservations: [] })
      .mockResolvedValueOnce({ reservations: [sampleReservation] })
    const { result } = renderHook(() => useMyReservations())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations).toEqual([])

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.reservations).toEqual([sampleReservation]))
  })

  it('flips a booking to canceled without waiting for a refetch', async () => {
    amenityApi.myReservations.mockResolvedValue({ reservations: [sampleReservation] })
    const { result } = renderHook(() => useMyReservations())

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.markCanceled(5))

    expect(result.current.reservations[0]).toMatchObject({ id: 5, status: 'Canceled' })
  })

  it('prefers the server copy of the canceled booking when it is given one', async () => {
    amenityApi.myReservations.mockResolvedValue({ reservations: [sampleReservation] })
    const { result } = renderHook(() => useMyReservations())

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() =>
      result.current.markCanceled(5, {
        ...sampleReservation,
        status: 'Canceled',
        updated_at: '2026-08-20T10:00:00Z',
      }),
    )

    expect(result.current.reservations[0]).toMatchObject({
      status: 'Canceled',
      updated_at: '2026-08-20T10:00:00Z',
    })
  })

  it('adds a freshly created booking without duplicating it', async () => {
    amenityApi.myReservations.mockResolvedValue({ reservations: [sampleReservation] })
    const { result } = renderHook(() => useMyReservations())

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.addReservation({ ...sampleReservation, amenity_name: 'زمین تنیس' }))

    expect(result.current.reservations).toHaveLength(1)
    expect(result.current.reservations[0].amenity_name).toBe('زمین تنیس')
  })
})
