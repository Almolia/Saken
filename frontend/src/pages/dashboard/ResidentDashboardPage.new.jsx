import {
  Building2,
  CalendarDays,
  ClipboardList,
  LogOut,
  Megaphone,
  Receipt,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
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
import { MobileTab } from '../../components/ui/MobileTab'
import { SideNavItem } from '../../components/ui/SideNavItem'
import { AdminProfile } from './admin/AdminProfile'
import { useChargeSelection } from '../../hooks/useChargeSelection'
import { useMyReservations } from '../../hooks/useMyReservations'
import { useMyUnit } from '../../hooks/useMyUnit'
import { usePaymentHistory } from '../../hooks/usePaymentHistory'
import { usePendingCharges } from '../../hooks/usePendingCharges'
import { useServiceRequests } from '../../hooks/useServiceRequests'
import { authApi } from '../../lib/api'
import { roleLabels } from '../../utils/constants'

const sectionTitles = {
  overview: 'نمای کلی',
  announcements: 'اطلاعیه‌ها',
  unit: 'واحد من',
  finances: 'امور مالی',
  amenities: 'امکانات و رزرو',
  services: 'درخواست خدمات',
  account: 'حساب کاربری',
}

export function ResidentDashboardPageNew({ authState, setAuthState }) {
  const [activeSection, setActiveSection] = useState('overview')
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-hidden border-l border-white/10 bg-slate-950 p-5 text-white xl:flex">
          <div className="rounded-[1.5rem] bg-white/5 p-4 ring-1 ring-white/10">
            <BrandMark dark compact />
          </div>

          <nav
            aria-label="منوی ساکن"
            className="mt-7 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-4 pr-1 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]"
          >
            <SideNavItem icon={UserRound} label="نمای کلی" active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} />
            <SideNavItem icon={Megaphone} label="اطلاعیه‌ها" active={activeSection === 'announcements'} onClick={() => setActiveSection('announcements')} />
            <SideNavItem icon={Building2} label="واحد من" active={activeSection === 'unit'} onClick={() => setActiveSection('unit')} />
            <SideNavItem icon={Wallet} label="امور مالی" active={activeSection === 'finances'} onClick={() => setActiveSection('finances')} />
            <SideNavItem icon={CalendarDays} label="امکانات و رزرو" active={activeSection === 'amenities'} onClick={() => setActiveSection('amenities')} />
            <SideNavItem icon={ClipboardList} label="درخواست خدمات" active={activeSection === 'services'} onClick={() => setActiveSection('services')} />
            <SideNavItem icon={Receipt} label="حساب کاربری" active={activeSection === 'account'} onClick={() => setActiveSection('account')} />
          </nav>

          <AdminProfile user={authState.user} onLogout={handleLogout} />
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-teal-700">
                  <ShieldCheck className="h-4 w-4" />
                  پنل ساکن
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {sectionTitles[activeSection]}
                </h1>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 xl:hidden"
                type="button"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
              <MobileTab active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} label="نمای کلی" />
              <MobileTab active={activeSection === 'announcements'} onClick={() => setActiveSection('announcements')} label="اطلاعیه‌ها" />
              <MobileTab active={activeSection === 'unit'} onClick={() => setActiveSection('unit')} label="واحد" />
              <MobileTab active={activeSection === 'finances'} onClick={() => setActiveSection('finances')} label="مالی" />
              <MobileTab active={activeSection === 'amenities'} onClick={() => setActiveSection('amenities')} label="رزرو" />
              <MobileTab active={activeSection === 'services'} onClick={() => setActiveSection('services')} label="خدمات" />
              <MobileTab active={activeSection === 'account'} onClick={() => setActiveSection('account')} label="حساب" />
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
            {activeSection === 'overview' ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <MiniInfoCard label="نام" value={authState.user.full_name} icon={UserRound} />
                  <MiniInfoCard label="شماره موبایل" value={authState.user.phone} icon={Users} />
                  <MiniInfoCard label="نقش" value={roleLabels[authState.user.role]} icon={ShieldCheck} />
                </div>
                <DebtSummaryCard unit={unit} loading={loading} />
                <UnitInfoCard unit={unit} loading={loading} error={error} onRetry={retry} />
              </div>
            ) : null}

            {activeSection === 'announcements' ? <AnnouncementFeed /> : null}

            {activeSection === 'unit' ? (
              <div className="space-y-6">
                <DebtSummaryCard unit={unit} loading={loading} />
                <UnitInfoCard unit={unit} loading={loading} error={error} onRetry={retry} />
              </div>
            ) : null}

            {activeSection === 'finances' ? (
              <div className="space-y-6">
                <DebtSummaryCard unit={unit} loading={loading} />
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
                <PaymentHistoryList
                  charges={paidCharges}
                  totalPaid={totalPaid}
                  loading={historyLoading}
                  error={historyError}
                  onRetry={refreshHistory}
                />
              </div>
            ) : null}

            {activeSection === 'amenities' ? (
              <div className="space-y-6">
                <AmenityBookingSection onBookingCreated={addReservation} slotsRefreshToken={freedSlotsToken} />
                <MyReservationsSection
                  reservations={reservations}
                  loading={reservationsLoading}
                  refreshing={reservationsRefreshing}
                  error={reservationsError}
                  onRetry={refreshReservations}
                  onCanceled={handleReservationCanceled}
                />
              </div>
            ) : null}

            {activeSection === 'services' ? (
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
            ) : null}

            {activeSection === 'account' ? (
              <AccountSettingsSection
                user={authState.user}
                setAuthState={setAuthState}
                updateProfile={authApi.updateResidentProfile}
                title="ویرایش اطلاعات و رمز عبور"
              />
            ) : null}
          </div>
        </main>
      </div>

      <PaymentModal
        open={chargesUnderPayment !== null}
        charges={chargesUnderPayment ?? []}
        unitDebt={unit?.unit_debt}
        onClose={() => setChargesUnderPayment(null)}
        onPaid={handlePaid}
        onFailed={refreshPendingCharges}
      />
    </div>
  )
}
