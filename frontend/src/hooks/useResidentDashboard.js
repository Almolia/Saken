import { useState } from 'react'
import { useChargeSelection } from './useChargeSelection'
import { useMyReservations } from './useMyReservations'
import { useMyUnit } from './useMyUnit'
import { usePaymentHistory } from './usePaymentHistory'
import { usePendingCharges } from './usePendingCharges'
import { useServiceRequests } from './useServiceRequests'

export function useResidentDashboard() {
  const { unit, loading, error, retry, refresh: refreshUnit } = useMyUnit()
  const {
    charges: pendingCharges,
    loading: chargesLoading,
    error: chargesError,
    refresh: refreshPendingCharges,
    removeCharges,
  } = usePendingCharges()
  const {
    charges: paidCharges,
    totalPaid,
    loading: historyLoading,
    error: historyError,
    refresh: refreshHistory,
  } = usePaymentHistory()
  const selection = useChargeSelection(pendingCharges)
  // Holds the charges the resident confirmed at the moment they hit "Pay
  // Selected"; null means the gateway is closed. Snapshotting rather than
  // reading the live selection keeps a background refresh from changing what
  // is being paid while the modal is open.
  const [chargesUnderPayment, setChargesUnderPayment] = useState(null)
  const {
    requests,
    loading: requestsLoading,
    refreshing: requestsRefreshing,
    error: requestsError,
    refresh: refreshRequests,
    addRequest,
  } = useServiceRequests()
  const {
    reservations,
    loading: reservationsLoading,
    refreshing: reservationsRefreshing,
    error: reservationsError,
    refresh: refreshReservations,
    markCanceled,
    addReservation,
  } = useMyReservations()
  // Bumped after a cancellation so the booking grid re-reads its slots and the
  // freed hour shows as available again.
  const [freedSlotsToken, setFreedSlotsToken] = useState(0)

  // The charges are already gone server-side, so they come off the list right
  // away; the unit is re-read in the background to pick up the authoritative
  // debt figure rather than trusting a locally subtracted one.
  function handlePaid(paidChargeIds) {
    removeCharges(paidChargeIds)
    selection.clear()
    refreshUnit()
    refreshHistory()
  }

  // The booking is already canceled server-side, so it moves to the "canceled"
  // bucket immediately instead of waiting on a refetch.
  function handleReservationCanceled(reservationId, canceledReservation) {
    markCanceled(reservationId, canceledReservation)
    setFreedSlotsToken((current) => current + 1)
  }

  return {
    unit,
    loading,
    error,
    retry,
    refreshUnit,
    pendingCharges,
    chargesLoading,
    chargesError,
    refreshPendingCharges,
    paidCharges,
    totalPaid,
    historyLoading,
    historyError,
    refreshHistory,
    selection,
    chargesUnderPayment,
    setChargesUnderPayment,
    requests,
    requestsLoading,
    requestsRefreshing,
    requestsError,
    refreshRequests,
    addRequest,
    reservations,
    reservationsLoading,
    reservationsRefreshing,
    reservationsError,
    refreshReservations,
    addReservation,
    freedSlotsToken,
    handlePaid,
    handleReservationCanceled,
  }
}
