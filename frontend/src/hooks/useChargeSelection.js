import { useCallback, useMemo, useState } from 'react'

// Amounts arrive as decimal strings ("500000.00"). Summing them as floats can
// drift by a fraction of a cent, so the running total is snapped back to two
// decimals before it ever reaches the UI or the payment modal.
export function sumChargeAmounts(charges) {
  const total = charges.reduce((sum, charge) => {
    const amount = Number.parseFloat(charge.amount)
    return Number.isFinite(amount) ? sum + amount : sum
  }, 0)
  return Math.round(total * 100) / 100
}

/**
 * Tracks which pending charges the resident has ticked.
 *
 * `charges` is the live list from usePendingCharges. The exposed selection is
 * derived from it rather than mirrored into state, so a charge that vanishes on
 * a refresh (paid elsewhere, withdrawn by a manager) drops straight out of the
 * total and out of the payload that gets submitted.
 */
export function useChargeSelection(charges) {
  const [tickedIds, setTickedIds] = useState([])

  const availableIds = useMemo(() => new Set(charges.map((charge) => charge.id)), [charges])

  const selectedIds = useMemo(
    () => tickedIds.filter((id) => availableIds.has(id)),
    [tickedIds, availableIds],
  )

  const toggle = useCallback((chargeId) => {
    setTickedIds((current) =>
      current.includes(chargeId)
        ? current.filter((id) => id !== chargeId)
        : [...current, chargeId],
    )
  }, [])

  const clear = useCallback(() => setTickedIds([]), [])

  const allSelected = charges.length > 0 && selectedIds.length === charges.length

  const toggleAll = useCallback(() => {
    setTickedIds((current) => {
      const ticked = current.filter((id) => availableIds.has(id))
      return ticked.length === availableIds.size ? [] : [...availableIds]
    })
  }, [availableIds])

  const selectedCharges = useMemo(
    () => charges.filter((charge) => selectedIds.includes(charge.id)),
    [charges, selectedIds],
  )

  const totalAmount = useMemo(() => sumChargeAmounts(selectedCharges), [selectedCharges])

  return {
    selectedIds,
    selectedCharges,
    totalAmount,
    allSelected,
    toggle,
    toggleAll,
    clear,
  }
}
