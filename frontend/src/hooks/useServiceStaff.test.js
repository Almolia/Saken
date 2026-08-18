import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { managerApi } from '../lib/api'
import { useServiceStaff } from './useServiceStaff'

vi.mock('../lib/api', () => ({
  managerApi: {
    serviceStaff: vi.fn(),
  },
}))

describe('useServiceStaff', () => {
  beforeEach(() => {
    managerApi.serviceStaff.mockReset()
  })

  it('loads the service staff list', async () => {
    const staff = [{ id: 1, full_name: 'کارمند خدمات' }]
    managerApi.serviceStaff.mockResolvedValue({ staff })

    const { result } = renderHook(() => useServiceStaff())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.staff).toEqual(staff)
    expect(result.current.error).toBe('')
  })

  it('can retry after a transient failure', async () => {
    managerApi.serviceStaff
      .mockRejectedValueOnce(new Error('خطای موقت سرور'))
      .mockResolvedValueOnce({ staff: [{ id: 2, full_name: 'نیروی خدمات' }] })

    const { result } = renderHook(() => useServiceStaff())
    await waitFor(() => expect(result.current.error).toBe('خطای موقت سرور'))

    act(() => result.current.refresh())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(managerApi.serviceStaff).toHaveBeenCalledTimes(2)
    expect(result.current.staff).toEqual([{ id: 2, full_name: 'نیروی خدمات' }])
    expect(result.current.error).toBe('')
  })
})
