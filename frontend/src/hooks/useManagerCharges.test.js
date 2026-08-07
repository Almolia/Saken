import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { managerChargeApi } from '../lib/billingApi'
import { useManagerCharges } from './useManagerCharges'

vi.mock('../lib/billingApi', () => ({
  managerChargeApi: {
    list: vi.fn(),
  },
}))

const sampleCharges = [
  {
    id: 1,
    title: 'شارژ شهریور',
    amount: '500000.00',
    due_date: '2026-09-20',
    apply_to_all: true,
  },
]

describe('useManagerCharges', () => {
  beforeEach(() => {
    managerChargeApi.list.mockReset()
  })

  it('starts in loading state and populates charges upon success', async () => {
    managerChargeApi.list.mockResolvedValue({ charges: sampleCharges })
    const { result } = renderHook(() => useManagerCharges())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.charges).toEqual(sampleCharges)
    expect(result.current.error).toBe('')
  })

  it('handles API errors gracefully', async () => {
    managerChargeApi.list.mockRejectedValue(new Error('خطایی در ارتباط با سرور رخ داد.'))
    const { result } = renderHook(() => useManagerCharges())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.charges).toEqual([])
    expect(result.current.error).toBe('خطایی در ارتباط با سرور رخ داد.')
  })

  it('dynamically prepends a newly added charge using addCharge', async () => {
    managerChargeApi.list.mockResolvedValue({ charges: sampleCharges })
    const { result } = renderHook(() => useManagerCharges())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const newCharge = {
      id: 2,
      title: 'شارژ مهر',
      amount: '600000.00',
      due_date: '2026-10-20',
      apply_to_all: true,
    }

    act(() => {
      result.current.addCharge(newCharge)
    })

    expect(result.current.charges).toEqual([newCharge, sampleCharges[0]])
  })

  it('triggers a refresh when refresh() is invoked', async () => {
    managerChargeApi.list.mockResolvedValue({ charges: sampleCharges })
    const { result } = renderHook(() => useManagerCharges())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(managerChargeApi.list).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => expect(managerChargeApi.list).toHaveBeenCalledTimes(2))
  })
})
