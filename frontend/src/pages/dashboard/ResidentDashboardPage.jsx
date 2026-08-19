import { LogOut, ShieldCheck, UserCog, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { AccountSettingsSection } from '../../components/dashboard/AccountSettingsSection'
import { AmenityBookingSection } from '../../components/dashboard/AmenityBookingSection'
import { AnnouncementFeed } from '../../components/dashboard/AnnouncementFeed'
import { DebtSummaryCard } from '../../components/dashboard/DebtSummaryCard'
import { MyReservationsSection } from '../../components/dashboard/MyReservationsSection'
import { PaymentHistoryList } from '../../components/dashboard/PaymentHistoryList'
import { PaymentModal } from '../../components/dashboard/PaymentModal'
import { PendingChargesList } from '../../components/dashboard/PendingChargesList'
import { ServiceRequestForm } from '../../components/dashboard/ServiceRequestForm'
import { ServiceRequestList } from '../../components/dashboard/ServiceRequestList'
import { UnitInfoCard } from '../../components/dashboard/UnitInfoCard'
import { AppearanceToggle } from '../../components/ui/AppearanceToggle'
import { BrandMark } from '../../components/ui/BrandMark'
import { MiniInfoCard } from '../../components/ui/MiniInfoCard'
import { Modal } from '../../components/ui/Modal'
import { useLogout } from '../../hooks/useLogout'
import { useResidentDashboard } from '../../hooks/useResidentDashboard'
import { roleLabels } from '../../utils/constants'
import { ResidentDashboardPageNew } from './ResidentDashboardPage.new'

const APPEARANCE_KEY = 'saken.residentDashboardAppearance'

function readAppearance() {
  try {
    return localStorage.getItem(APPEARANCE_KEY) === 'new' ? 'new' : 'legacy'
  } catch {
    return 'legacy'
  }
}

export function ResidentDashboardPage({ authState, setAuthState }) {
  const [appearance, setAppearance] = useState(readAppearance)
  const dashboard = useResidentDashboard()

  function toggleAppearance() {
    setAppearance((current) => {
      const next = current === 'new' ? 'legacy' : 'new'
      try {
        localStorage.setItem(APPEARANCE_KEY, next)
      } catch {
        // Persistence is best-effort; the in-memory toggle still works.
      }
      return next
    })
  }

  return (
    <>
      <AppearanceToggle isNew={appearance === 'new'} onToggle={toggleAppearance} />
      {appearance === 'new' ? (
        <ResidentDashboardPageNew authState={authState} setAuthState={setAuthState} dashboard={dashboard} />
      ) : (
        <ResidentDashboardLegacy authState={authState} setAuthState={setAuthState} dashboard={dashboard} />
      )}
    </>
  )
}

function ResidentDashboardLegacy({ authState, setAuthState, dashboard }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const handleLogout = useLogout(setAuthState)

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          <div className="panel-hero p-6 text-slate-900 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <BrandMark />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-100"
                  type="button"
                  onClick={() => setAccountOpen(true)}
                >
                  <UserCog className="h-4 w-4" />
                  ویرایش حساب
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-200"
                  type="button"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  خروج
                </button>
              </div>
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

        {/* Building-wide news sits directly under the header, above the
            resident's own unit details, so it is read before anything else. */}
        <AnnouncementFeed />

        <DebtSummaryCard unit={dashboard.unit} loading={dashboard.loading} />

        <UnitInfoCard
          unit={dashboard.unit}
          loading={dashboard.loading}
          error={dashboard.error}
          onRetry={dashboard.retry}
        />

        <PendingChargesList
          charges={dashboard.pendingCharges}
          loading={dashboard.chargesLoading}
          error={dashboard.chargesError}
          onRetry={dashboard.refreshPendingCharges}
          selectedIds={dashboard.selection.selectedIds}
          allSelected={dashboard.selection.allSelected}
          onToggle={dashboard.selection.toggle}
          onToggleAll={dashboard.selection.toggleAll}
          onPay={() => dashboard.setChargesUnderPayment(dashboard.selection.selectedCharges)}
          totalSelected={dashboard.selection.totalAmount}
          unitDebt={dashboard.unit?.unit_debt}
        />

        <PaymentModal
          open={dashboard.chargesUnderPayment !== null}
          charges={dashboard.chargesUnderPayment ?? []}
          unitDebt={dashboard.unit?.unit_debt}
          onClose={() => dashboard.setChargesUnderPayment(null)}
          onPaid={dashboard.handlePaid}
          onFailed={dashboard.refreshPendingCharges}
        />

        <PaymentHistoryList
          charges={dashboard.paidCharges}
          totalPaid={dashboard.totalPaid}
          loading={dashboard.historyLoading}
          error={dashboard.historyError}
          onRetry={dashboard.refreshHistory}
        />

        <AmenityBookingSection
          onBookingCreated={dashboard.addReservation}
          slotsRefreshToken={dashboard.freedSlotsToken}
        />

        <MyReservationsSection
          reservations={dashboard.reservations}
          loading={dashboard.reservationsLoading}
          refreshing={dashboard.reservationsRefreshing}
          error={dashboard.reservationsError}
          onRetry={dashboard.refreshReservations}
          onCanceled={dashboard.handleReservationCanceled}
        />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <ServiceRequestForm onRequestCreated={dashboard.addRequest} />
          <ServiceRequestList
            requests={dashboard.requests}
            loading={dashboard.requestsLoading}
            refreshing={dashboard.requestsRefreshing}
            error={dashboard.requestsError}
            onRetry={dashboard.refreshRequests}
          />
        </div>
      </div>

      <Modal
        open={accountOpen}
        title="ویرایش حساب کاربری"
        description="اطلاعات شخصی و رمز عبور خود را به‌روزرسانی کنید."
        onClose={() => setAccountOpen(false)}
        size="lg"
      >
        <AccountSettingsSection
          user={authState.user}
          setAuthState={setAuthState}
          heading="اطلاعات حساب"
          description="پس از ذخیره، اطلاعات نمایش‌داده‌شده در داشبورد بلافاصله به‌روز می‌شود."
          showOverview={false}
        />
      </Modal>
    </div>
  )
}
