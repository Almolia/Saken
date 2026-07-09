import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useMyUnit } from './useMyUnit'

const sampleUnit = { id: 1, unit_number: '102', floor: 1, area: '85.00', building: 1, details: '' }

describe('useMyUnit', () => {
  it('starts in the loading state', () => {
    const fetchUnit = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useMyUnit(fetchUnit))

    expect(result.current.loading).toBe(true)
    expect(result.current.unit).toBeNull()
    expect(result.current.error).toBe('')
  })

  it('exposes the unit after a successful fetch', async () => {
    const fetchUnit = vi.fn().mockResolvedValue(sampleUnit)
    const { result } = renderHook(() => useMyUnit(fetchUnit))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.unit).toEqual(sampleUnit)
    expect(result.current.error).toBe('')
  })

  it('takes the first unit when the endpoint returns an array', async () => {
    const secondUnit = { ...sampleUnit, id: 2, unit_number: '201' }
    const fetchUnit = vi.fn().mockResolvedValue([sampleUnit, secondUnit])
    const { result } = renderHook(() => useMyUnit(fetchUnit))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.unit).toEqual(sampleUnit)
  })

  it('exposes the error message when the fetch fails', async () => {
    const fetchUnit = vi.fn().mockRejectedValue(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
    const { result } = renderHook(() => useMyUnit(fetchUnit))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.unit).toBeNull()
    expect(result.current.error).toBe('خطایی در ارتباط با سرور رخ داد.')
  })

  it('treats a 404 as "no unit assigned" instead of an error', async () => {
    const fetchUnit = vi.fn().mockRejectedValue(Object.assign(new Error('No unit assigned to this user.'), { status: 404 }))
    const { result } = renderHook(() => useMyUnit(fetchUnit))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.unit).toBeNull()
    expect(result.current.error).toBe('')
  })

  it('recovers after a failed fetch when retry succeeds', async () => {
    const fetchUnit = vi
      .fn()
      .mockRejectedValueOnce(new Error('خطای موقت'))
      .mockResolvedValueOnce(sampleUnit)
    const { result } = renderHook(() => useMyUnit(fetchUnit))

    await waitFor(() => expect(result.current.error).toBe('خطای موقت'))

    act(() => result.current.retry())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('')
    expect(result.current.unit).toEqual(sampleUnit)
  })
})
