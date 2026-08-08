import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useChargeSelection } from './useChargeSelection'

const charges = [
  { id: 1, title: 'شارژ شهریور', amount: '500000.00' },
  { id: 2, title: 'شارژ مهر', amount: '250000.50' },
  { id: 3, title: 'قبض آب', amount: '120000.25' },
]

describe('useChargeSelection', () => {
  it('starts with nothing selected and a zero total', () => {
    const { result } = renderHook(() => useChargeSelection(charges))

    expect(result.current.selectedIds).toEqual([])
    expect(result.current.totalAmount).toBe(0)
    expect(result.current.allSelected).toBe(false)
  })

  it('toggles a charge on and back off', () => {
    const { result } = renderHook(() => useChargeSelection(charges))

    act(() => result.current.toggle(2))
    expect(result.current.selectedIds).toEqual([2])
    expect(result.current.selectedCharges).toEqual([charges[1]])

    act(() => result.current.toggle(2))
    expect(result.current.selectedIds).toEqual([])
  })

  it('sums the selected amounts without floating point drift', () => {
    const { result } = renderHook(() => useChargeSelection(charges))

    act(() => result.current.toggle(2))
    act(() => result.current.toggle(3))

    expect(result.current.totalAmount).toBe(370000.75)
  })

  it('selects every charge and then clears them with toggleAll', () => {
    const { result } = renderHook(() => useChargeSelection(charges))

    act(() => result.current.toggleAll())
    expect(result.current.selectedIds).toEqual([1, 2, 3])
    expect(result.current.allSelected).toBe(true)

    act(() => result.current.toggleAll())
    expect(result.current.selectedIds).toEqual([])
  })

  it('clears the selection', () => {
    const { result } = renderHook(() => useChargeSelection(charges))

    act(() => result.current.toggleAll())
    act(() => result.current.clear())

    expect(result.current.selectedIds).toEqual([])
  })

  it('drops ids for charges that disappear from the list', () => {
    const { rerender, result } = renderHook(({ list }) => useChargeSelection(list), {
      initialProps: { list: charges },
    })

    act(() => result.current.toggleAll())
    expect(result.current.selectedIds).toEqual([1, 2, 3])

    // Charge 2 was paid (or removed by a manager) and is gone after a refresh.
    rerender({ list: [charges[0], charges[2]] })

    expect(result.current.selectedIds).toEqual([1, 3])
    expect(result.current.totalAmount).toBe(620000.25)
  })
})
