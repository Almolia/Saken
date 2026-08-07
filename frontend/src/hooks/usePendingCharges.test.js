import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { usePendingCharges } from './usePendingCharges'

vi.mock('../lib/billingApi', () => ({
  residentChargeApi: {
    pending: vi.fn(),
  },
}))

import { residentChargeApi } from '../lib/billingApi'

const sampleCharge = {
  id: 1,
  title: 'شارژ شهریور',
  description: 'نظافت مشاعات',
  amount: '500000.00',
  due_date: '2026-09-20',
  status: 'Pending',
}

describe('usePendingCharges', () => {
  it('starts in the loading state', () => {
    residentChargeApi.pending.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePendingCharges())

    expect(result.current.loading).toBe(true)
    expect(result.current.charges).toEqual([])
    expect(result.current.error).toBe('')
  })

  it('exposes the pending charges after a successful fetch', async () => {
    residentChargeApi.pending.mockResolvedValue({ charges: [sampleCharge] })
    const { result } = renderHook(() => usePendingCharges())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.charges).toEqual([sampleCharge])
    expect(result.current.error).toBe('')
  })

  it('normalizes a bare-array response', async () => {
    residentChargeApi.pending.mockResolvedValue([sampleCharge])
    const { result } = renderHook(() => usePendingCharges())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.charges).toEqual([sampleCharge])
  })

  it('exposes the error message when the fetch fails', async () => {
    residentChargeApi.pending.mockRejectedValue(
      Object.assign(new Error('خطایی در دریافت شارژهای پرداخت‌نشده رخ داد.'), { status: 500 }),
    )
    const { result } = renderHook(() => usePendingCharges())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.charges).toEqual([])
    expect(result.current.error).toBe('خطایی در دریافت شارژهای پرداخت‌نشده رخ داد.')
  })

  it('refreshes the list when refresh is called', async () => {
    residentChargeApi.pending
      .mockResolvedValueOnce({ charges: [] })
      .mockResolvedValueOnce({ charges: [sampleCharge] })
    const { result } = renderHook(() => usePendingCharges())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.charges).toEqual([])

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.charges).toEqual([sampleCharge]))
  })
})
