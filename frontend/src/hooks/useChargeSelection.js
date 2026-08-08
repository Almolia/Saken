import { useCallback, useEffect, useMemo, useState } from 'react'

// Amounts arrive as decimal strings ("500000.00"). Summing them as floats can
// drift by a fraction of a cent, so the running total is snapped back to two
// decimals before it ever reaches the UI or the payment modal.
function sumAmounts(charges) {
  const total = charges.reduce((sum, charge) => {
    const amount = Number.parseFloat(charge.amount)
    return Number.isFinite(amount) ? sum + amount : sum
  }, 0)
  return Math.round(total * 100) / 100
}

/**
 * Tracks which pending charges the resident has ticked.
 *
 * `charges` is the live list from usePendingCharges; the selection follows it,
 * so paying (or a refresh that drops a charge someone else settled) never
 * leaves a stale id behind in the total or in the submitted payload.
 */
export function useChargeSelection(charges) {
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    setSelectedIds((current) => {
      if (current.length === 0) return current
      const available = new Set(charges.map((charge) => charge.id))
      const next = current.filter((id) => available.has(id))
      // Returning the same array keeps this from looping on every render.
      return next.length === current.length ? current : next
    })
  }, [charges])

  const toggle = useCallback((chargeId) => {
    setSelectedIds((current) =>
      current.includes(chargeId)
        ? current.filter((id) => id !== chargeId)
        : [...current, chargeId],
    )
  }, [])

  const clear = useCallback(() => setSelectedIds([]), [])

  const toggleAll = useCallback(() => {
    setSelectedIds((current) =>
      current.length === charges.length ? [] : charges.map((charge) => charge.id),
    )
  }, [charges])

  const selectedCharges = useMemo(
    () => charges.filter((charge) => selectedIds.includes(charge.id)),
    [charges, selectedIds],
  )

  const totalAmount = useMemo(() => sumAmounts(selectedCharges), [selectedCharges])

  const allSelected = charges.length > 0 && selectedIds.length === charges.length

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
