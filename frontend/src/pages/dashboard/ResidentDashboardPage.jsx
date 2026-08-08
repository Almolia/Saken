import { LogOut, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { DebtSummaryCard } from '../../components/dashboard/DebtSummaryCard'
import { PaymentModal } from '../../components/dashboard/PaymentModal'
import { PendingChargesList } from '../../components/dashboard/PendingChargesList'
import { ServiceRequestForm } from '../../components/dashboard/ServiceRequestForm'
import { ServiceRequestList } from '../../components/dashboard/ServiceRequestList'
import { UnitInfoCard } from '../../components/dashboard/UnitInfoCard'
import { BrandMark } from '../../components/ui/BrandMark'
import { MiniInfoCard } from '../../components/ui/MiniInfoCard'
import { useChargeSelection } from '../../hooks/useChargeSelection'
import { useMyUnit } from '../../hooks/useMyUnit'
import { usePendingCharges } from '../../hooks/usePendingCharges'
import { useServiceRequests } from '../../hooks/useServiceRequests'
import { authApi } from '../../lib/api'
import { roleLabels } from '../../utils/constants'

export function ResidentDashboardPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { unit, loading, error, retry, refresh: refreshUnit } = useMyUnit()
  const {
    charges: pendingCharges,
    loading: chargesLoading,
    error: chargesError,
    refresh: refreshPendingCharges,
    removeCharges,
  } = usePendingCharges()
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

  // The charges are already gone server-side, so they come off the list right
  // away; the unit is re-read in the background to pick up the authoritative
  // debt figure rather than trusting a locally subtracted one.
  function handlePaid(paidChargeIds) {
    removeCharges(paidChargeIds)
    selection.clear()
    refreshUnit()
  }

  async function handleLogout() {
    await authApi.logout()
    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    navigate('/login', { replace: true })
  }

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
      </div>
    </div>
  )
}
