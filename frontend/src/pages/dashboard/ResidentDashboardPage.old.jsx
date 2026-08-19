import { LogOut, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { useLogout } from '../../hooks/useLogout'
import { AnnouncementFeed } from '../../components/dashboard/AnnouncementFeed'
import { DebtSummaryCard } from '../../components/dashboard/DebtSummaryCard'
import { PaymentHistoryList } from '../../components/dashboard/PaymentHistoryList'
import { PaymentModal } from '../../components/dashboard/PaymentModal'
import { PendingChargesList } from '../../components/dashboard/PendingChargesList'
import { ServiceRequestForm } from '../../components/dashboard/ServiceRequestForm'
import { ServiceRequestList } from '../../components/dashboard/ServiceRequestList'
import { UnitInfoCard } from '../../components/dashboard/UnitInfoCard'
import { AmenityBookingSection } from '../../components/dashboard/AmenityBookingSection'
import { MyReservationsSection } from '../../components/dashboard/MyReservationsSection'
import { AccountSettingsSection } from '../../components/dashboard/AccountSettingsSection'
import { BrandMark } from '../../components/ui/BrandMark'
import { MiniInfoCard } from '../../components/ui/MiniInfoCard'
import { useChargeSelection } from '../../hooks/useChargeSelection'
import { useMyReservations } from '../../hooks/useMyReservations'
import { useMyUnit } from '../../hooks/useMyUnit'
import { usePaymentHistory } from '../../hooks/usePaymentHistory'
import { usePendingCharges } from '../../hooks/usePendingCharges'
import { useServiceRequests } from '../../hooks/useServiceRequests'
import { authApi } from '../../lib/api'
import { roleLabels } from '../../utils/constants'

export function ResidentDashboardPageOld({ authState, setAuthState }) {
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
  const [freedSlotsToken, setFreedSlotsToken] = useState(0)

  function handlePaid(paidChargeIds) {
    removeCharges(paidChargeIds)
    selection.clear()
    refreshUnit()
    refreshHistory()
  }

  function handleReservationCanceled(reservationId, canceledReservation) {
    markCanceled(reservationId, canceledReservation)
    setFreedSlotsToken((current) => current + 1)
  }

  const handleLogout = useLogout(setAuthState)

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          <div className="panel-hero p-6 text-slate-900 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <BrandMark />
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-200"
                type="button"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </div>
            <div className="mt-10 max-w-2xl">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">پنل ساکن</h1>
              <p className="mt-3 text-sm leading-8 text-slate-600">
                خوش آمدید؛ اطلاعات حساب، واحد مسکونی و درخواست‌های خدمات شما در این بخش نمایش داده می‌شود.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:p-8 md:grid-cols-3">
            <MiniInfoCard label="نام" value={authState.user.full_name} icon={UserRound} />
            <MiniInfoCard label="شماره موبایل" value={authState.user.phone} icon={Users} />
            <MiniInfoCard label="نقش" value={roleLabels[authState.user.role]} icon={ShieldCheck} />
          </div>
        </div>

        <AnnouncementFeed />

        <DebtSummaryCard unit={unit} loading={loading} />

        <UnitInfoCard unit={unit} loading={loading} error={error} onRetry={retry} />

        <PendingChargesList
          charges={pendingCharges}
          loading={chargesLoading}
          error={chargesError}
          onRetry={refreshPendingCharges}
          selectedIds={selection.selectedIds}
          allSelected={selection.allSelected}
          onToggle={selection.toggle}
          onToggleAll={selection.toggleAll}
          onPay={() => setChargesUnderPayment(selection.selectedCharges)}
          totalSelected={selection.totalAmount}
          unitDebt={unit?.unit_debt}
        />

        <PaymentModal
          open={chargesUnderPayment !== null}
          charges={chargesUnderPayment ?? []}
          unitDebt={unit?.unit_debt}
          onClose={() => setChargesUnderPayment(null)}
          onPaid={handlePaid}
          onFailed={refreshPendingCharges}
        />

        <PaymentHistoryList
          charges={paidCharges}
          totalPaid={totalPaid}
          loading={historyLoading}
          error={historyError}
          onRetry={refreshHistory}
        />

        <AmenityBookingSection
          onBookingCreated={addReservation}
          slotsRefreshToken={freedSlotsToken}
        />

        <MyReservationsSection
          reservations={reservations}
          loading={reservationsLoading}
          refreshing={reservationsRefreshing}
          error={reservationsError}
          onRetry={refreshReservations}
          onCanceled={handleReservationCanceled}
        />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <ServiceRequestForm onRequestCreated={addRequest} />
          <ServiceRequestList
            requests={requests}
            loading={requestsLoading}
            refreshing={requestsRefreshing}
            error={requestsError}
            onRetry={refreshRequests}
          />
        </div>

        <AccountSettingsSection
          user={authState.user}
          setAuthState={setAuthState}
          updateProfile={authApi.updateResidentProfile}
          title="ویرایش اطلاعات و رمز عبور"
        />
      </div>
    </div>
  )
}
