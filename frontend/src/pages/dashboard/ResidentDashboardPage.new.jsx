import {
  Building2,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  Home,
  LogOut,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { AccountSettingsSection } from '../../components/dashboard/AccountSettingsSection'
import { AmenityBookingSection } from '../../components/dashboard/AmenityBookingSection'
import { MyReservationsSection } from '../../components/dashboard/MyReservationsSection'
import { PaymentHistoryList } from '../../components/dashboard/PaymentHistoryList'
import { PaymentModal } from '../../components/dashboard/PaymentModal'
import { PendingChargesList } from '../../components/dashboard/PendingChargesList'
import { ServiceRequestForm } from '../../components/dashboard/ServiceRequestForm'
import { ServiceRequestList } from '../../components/dashboard/ServiceRequestList'
import { AdminProfile } from './admin/AdminProfile'
import { BrandMark } from '../../components/ui/BrandMark'
import { MobileTab } from '../../components/ui/MobileTab'
import { SideNavItem } from '../../components/ui/SideNavItem'
import { useLogout } from '../../hooks/useLogout'
import { ReservationCategory, groupReservations } from '../../utils/reservations'
import { isCompleted } from '../../utils/serviceRequests'
import { ResidentHomeSectionNew } from './ResidentHomeSection.new'

const sectionTitles = {
  home: 'نمای کلی',
  charges: 'شارژ و پرداخت',
  amenities: 'امکانات ساختمان',
  reservations: 'رزروهای من',
  services: 'درخواست خدمات',
  account: 'حساب کاربری',
}

export function ResidentDashboardPageNew({ authState, setAuthState, dashboard }) {
  const [activeSection, setActiveSection] = useState('home')
  const handleLogout = useLogout(setAuthState)

  const upcomingCount = useMemo(
    () => groupReservations(dashboard.reservations)[ReservationCategory.UPCOMING].length,
    [dashboard.reservations],
  )
  const openRequests = useMemo(
    () => dashboard.requests.filter((request) => !isCompleted(request)).length,
    [dashboard.requests],
  )
  const pendingCount = dashboard.pendingCharges.length

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
            <SideNavItem icon={Home} label="خانه" active={activeSection === 'home'} onClick={() => setActiveSection('home')} />
            <SideNavItem
              icon={CreditCard}
              label="شارژ و پرداخت"
              active={activeSection === 'charges'}
              onClick={() => setActiveSection('charges')}
              badge={pendingCount || undefined}
            />
            <SideNavItem
              icon={Building2}
              label="امکانات"
              active={activeSection === 'amenities'}
              onClick={() => setActiveSection('amenities')}
            />
            <SideNavItem
              icon={CalendarCheck}
              label="رزروهای من"
              active={activeSection === 'reservations'}
              onClick={() => setActiveSection('reservations')}
              badge={upcomingCount || undefined}
            />
            <SideNavItem
              icon={ClipboardList}
              label="درخواست خدمات"
              active={activeSection === 'services'}
              onClick={() => setActiveSection('services')}
              badge={openRequests || undefined}
            />
            <SideNavItem
              icon={UserRound}
              label="حساب کاربری"
              active={activeSection === 'account'}
              onClick={() => setActiveSection('account')}
            />
          </nav>

          <AdminProfile user={authState.user} onLogout={handleLogout} />
        </aside>

        <main className="min-w-0 flex-1 pb-24">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-teal-700">
                  <Home className="h-4 w-4" />
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
              <MobileTab active={activeSection === 'home'} onClick={() => setActiveSection('home')} label="خانه" />
              <MobileTab
                active={activeSection === 'charges'}
                onClick={() => setActiveSection('charges')}
                label="شارژ"
                badge={pendingCount || undefined}
              />
              <MobileTab active={activeSection === 'amenities'} onClick={() => setActiveSection('amenities')} label="امکانات" />
              <MobileTab
                active={activeSection === 'reservations'}
                onClick={() => setActiveSection('reservations')}
                label="رزروها"
                badge={upcomingCount || undefined}
              />
              <MobileTab
                active={activeSection === 'services'}
                onClick={() => setActiveSection('services')}
                label="خدمات"
                badge={openRequests || undefined}
              />
              <MobileTab active={activeSection === 'account'} onClick={() => setActiveSection('account')} label="حساب کاربری" />
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
            {activeSection === 'home' ? (
              <ResidentHomeSectionNew user={authState.user} dashboard={dashboard} onNavigate={setActiveSection} />
            ) : null}

            {activeSection === 'charges' ? (
              <>
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
                <PaymentHistoryList
                  charges={dashboard.paidCharges}
                  totalPaid={dashboard.totalPaid}
                  loading={dashboard.historyLoading}
                  error={dashboard.historyError}
                  onRetry={dashboard.refreshHistory}
                />
              </>
            ) : null}

            {activeSection === 'amenities' ? (
              <AmenityBookingSection
                onBookingCreated={dashboard.addReservation}
                slotsRefreshToken={dashboard.freedSlotsToken}
              />
            ) : null}

            {activeSection === 'reservations' ? (
              <MyReservationsSection
                reservations={dashboard.reservations}
                loading={dashboard.reservationsLoading}
                refreshing={dashboard.reservationsRefreshing}
                error={dashboard.reservationsError}
                onRetry={dashboard.refreshReservations}
                onCanceled={dashboard.handleReservationCanceled}
              />
            ) : null}

            {activeSection === 'services' ? (
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
            ) : null}

            {activeSection === 'account' ? (
              <AccountSettingsSection user={authState.user} setAuthState={setAuthState} />
            ) : null}
          </div>
        </main>
      </div>

      <PaymentModal
        open={dashboard.chargesUnderPayment !== null}
        charges={dashboard.chargesUnderPayment ?? []}
        unitDebt={dashboard.unit?.unit_debt}
        onClose={() => dashboard.setChargesUnderPayment(null)}
        onPaid={dashboard.handlePaid}
        onFailed={dashboard.refreshPendingCharges}
      />
    </div>
  )
}
