import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useBuildingSettings } from './useBuildingSettings'

const sampleBuilding = {
  id: 1,
  name: 'برج ساکن',
  building_wallet_balance: '5000.00',
  total_units: 12,
}

describe('useBuildingSettings', () => {
  it('starts in the loading state', () => {
    const fetchBuilding = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useBuildingSettings(fetchBuilding))

    expect(result.current.loading).toBe(true)
    expect(result.current.building).toBeNull()
    expect(result.current.missing).toBe(false)
  })

  it('exposes the building after a successful fetch', async () => {
    const fetchBuilding = vi.fn().mockResolvedValue(sampleBuilding)
    const { result } = renderHook(() => useBuildingSettings(fetchBuilding))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.building).toEqual(sampleBuilding)
    expect(result.current.error).toBe('')
    expect(result.current.missing).toBe(false)
  })

  it('treats a 404 as "not registered yet" rather than an error', async () => {
    const fetchBuilding = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('اطلاعات ساختمان هنوز ثبت نشده است.'), { status: 404 }))
    const { result } = renderHook(() => useBuildingSettings(fetchBuilding))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missing).toBe(true)
    expect(result.current.error).toBe('')
  })

  it('surfaces other failures as errors', async () => {
    const fetchBuilding = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
    const { result } = renderHook(() => useBuildingSettings(fetchBuilding))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('خطایی در ارتباط با سرور رخ داد.')
    expect(result.current.missing).toBe(false)
  })

  it('re-reads the building when retry is called', async () => {
    const fetchBuilding = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))
      .mockResolvedValueOnce(sampleBuilding)
    const { result } = renderHook(() => useBuildingSettings(fetchBuilding))

    await waitFor(() => expect(result.current.error).toBe('boom'))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.building).toEqual(sampleBuilding))
  })

  it('takes the saved copy from either response shape', async () => {
    const fetchBuilding = vi.fn().mockResolvedValue(sampleBuilding)
    const { result } = renderHook(() => useBuildingSettings(fetchBuilding))

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.applyBuilding({ building: { ...sampleBuilding, name: 'برج جدید' } }))
    expect(result.current.building.name).toBe('برج جدید')

    act(() => result.current.applyBuilding({ ...sampleBuilding, name: 'برج سوم' }))
    expect(result.current.building.name).toBe('برج سوم')
  })
})
