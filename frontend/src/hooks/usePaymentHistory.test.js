import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { usePaymentHistory } from './usePaymentHistory'

vi.mock('../lib/billingApi', () => ({
  residentChargeApi: {
    history: vi.fn(),
  },
}))

import { residentChargeApi } from '../lib/billingApi'

const august = {
  id: 1,
  title: 'شارژ مرداد',
  amount: '500000.00',
  status: 'Paid',
  paid_at: '2026-08-01T10:00:00Z',
}
const september = {
  id: 2,
  title: 'شارژ شهریور',
  amount: '250000.00',
  status: 'Paid',
  paid_at: '2026-09-01T10:00:00Z',
}

describe('usePaymentHistory', () => {
  beforeEach(() => {
    residentChargeApi.history.mockReset()
  })

  it('starts in the loading state', () => {
    residentChargeApi.history.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePaymentHistory())

    expect(result.current.loading).toBe(true)
    expect(result.current.charges).toEqual([])
    expect(result.current.error).toBe('')
  })

  it('exposes the settled charges and the total after a successful fetch', async () => {
    residentChargeApi.history.mockResolvedValue({
      charges: [september],
      total_paid: '250000.00',
    })
    const { result } = renderHook(() => usePaymentHistory())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.charges).toEqual([september])
    expect(result.current.totalPaid).toBe('250000.00')
    expect(result.current.error).toBe('')
  })

  it('orders the history newest payment first whatever order the payload used', async () => {
    residentChargeApi.history.mockResolvedValue({ charges: [august, september] })
    const { result } = renderHook(() => usePaymentHistory())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.charges.map((charge) => charge.id)).toEqual([2, 1])
  })

  it('normalizes a bare-array response and defaults the total', async () => {
    residentChargeApi.history.mockResolvedValue([september])
    const { result } = renderHook(() => usePaymentHistory())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.charges).toEqual([september])
    expect(result.current.totalPaid).toBe('0')
  })

  it('exposes the error message when the fetch fails', async () => {
    residentChargeApi.history.mockRejectedValue(
      Object.assign(new Error('خطایی در دریافت تاریخچه پرداخت رخ داد.'), { status: 500 }),
    )
    const { result } = renderHook(() => usePaymentHistory())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.charges).toEqual([])
    expect(result.current.error).toBe('خطایی در دریافت تاریخچه پرداخت رخ داد.')
  })

  it('keeps the settled rows on screen while a refresh is in flight', async () => {
    let resolveSecond
    residentChargeApi.history
      .mockResolvedValueOnce({ charges: [august], total_paid: '500000.00' })
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }))
    const { result } = renderHook(() => usePaymentHistory())

    await waitFor(() => expect(result.current.charges).toHaveLength(1))

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.refreshing).toBe(true))
    expect(result.current.loading).toBe(false)
    expect(result.current.charges).toHaveLength(1)

    await act(async () => {
      resolveSecond({ charges: [august, september], total_paid: '750000.00' })
    })
    await waitFor(() => expect(result.current.charges).toHaveLength(2))
    expect(result.current.refreshing).toBe(false)
  })

  describe('when the view has not been opened yet', () => {
    it('does not call the endpoint', () => {
      residentChargeApi.history.mockResolvedValue({ charges: [] })
      renderHook(() => usePaymentHistory({ enabled: false }))

      expect(residentChargeApi.history).not.toHaveBeenCalled()
    })

    it('fetches as soon as the view is opened', async () => {
      residentChargeApi.history.mockResolvedValue({ charges: [september], total_paid: '250000.00' })
      const { rerender, result } = renderHook(({ enabled }) => usePaymentHistory({ enabled }), {
        initialProps: { enabled: false },
      })

      rerender({ enabled: true })

      await waitFor(() => expect(result.current.charges).toEqual([september]))
      expect(residentChargeApi.history).toHaveBeenCalledTimes(1)
    })

    it('keeps refreshing after a payment once the view has been opened, and does not re-read on every visit', async () => {
      residentChargeApi.history.mockResolvedValue({ charges: [september], total_paid: '250000.00' })
      const { rerender, result } = renderHook(({ enabled }) => usePaymentHistory({ enabled }), {
        initialProps: { enabled: true },
      })

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(residentChargeApi.history).toHaveBeenCalledTimes(1)

      // Resident switches to another tab, pays, and comes back: the payment
      // triggers exactly one re-read, and returning to the tab triggers none.
      rerender({ enabled: false })
      act(() => result.current.refresh())
      await waitFor(() => expect(residentChargeApi.history).toHaveBeenCalledTimes(2))

      rerender({ enabled: true })
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(residentChargeApi.history).toHaveBeenCalledTimes(2)
    })
  })
})
