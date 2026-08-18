import {
  Building2,
  Building,
  ClipboardList,
  FileSpreadsheet,
  Landmark,
  LogOut,
  Megaphone,
  PieChart,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useLogout } from '../../hooks/useLogout'
import { useUserDirectory } from '../../hooks/useUserDirectory'
import { BrandMark } from '../../components/ui/BrandMark'
import { MobileTab } from '../../components/ui/MobileTab'
import { SideNavItem } from '../../components/ui/SideNavItem'
import { AdminProfile } from './admin/AdminProfile'
import { AmenitiesSection } from './manager/AmenitiesSection'
import { AnnouncementsSection } from './manager/AnnouncementsSection'
import { BuildingSettingsSection } from './manager/BuildingSettingsSection'
import { FinancialsSection } from './manager/FinancialsSection'
import { ReportsSection } from './manager/ReportsSection'
import { ServiceReportsSection } from './manager/ServiceReportsSection'
import { ServiceRequestsSection } from './manager/ServiceRequestsSection'
import { UnitsSection } from './manager/UnitsSection'
import { UsersSection } from './manager/UsersSection'

const sectionTitles = {
  requests: 'درخواست‌های خدمات',
  serviceReports: 'گزارش خدمات',
  building: 'تنظیمات ساختمان',
  units: 'فهرست واحدها',
  amenities: 'امکانات',
  announcements: 'اطلاعیه‌ها',
  financials: 'امور مالی',
  reports: 'گزارش مالی',
  users: 'کاربران',
}

export function ManagerDashboardPage({ authState, setAuthState }) {
  const [activeSection, setActiveSection] = useState('requests')
  const { data: userData, actionState, changeRole } = useUserDirectory()

  const handleLogout = useLogout(setAuthState)

  const pageTitle = sectionTitles[activeSection]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-hidden border-l border-white/10 bg-slate-950 p-5 text-white xl:flex">
          <div className="rounded-[1.5rem] bg-white/5 p-4 ring-1 ring-white/10">
            <BrandMark dark compact />
          </div>

          <nav aria-label="منوی مدیریت" className="mt-7 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-4 pr-1 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
            <SideNavItem
              icon={ClipboardList}
              label="درخواست‌های خدمات"
              active={activeSection === 'requests'}
              onClick={() => setActiveSection('requests')}
            />
            <SideNavItem
              icon={FileSpreadsheet}
              label="گزارش خدمات"
              active={activeSection === 'serviceReports'}
              onClick={() => setActiveSection('serviceReports')}
            />
            <SideNavItem
              icon={Landmark}
              label="تنظیمات ساختمان"
              active={activeSection === 'building'}
              onClick={() => setActiveSection('building')}
            />
            <SideNavItem
              icon={Building2}
              label="فهرست واحدها"
              active={activeSection === 'units'}
              onClick={() => setActiveSection('units')}
            />
            <SideNavItem
              icon={Building}
              label="امکانات"
              active={activeSection === 'amenities'}
              onClick={() => setActiveSection('amenities')}
            />
            <SideNavItem
              icon={Megaphone}
              label="اطلاعیه‌ها"
              active={activeSection === 'announcements'}
              onClick={() => setActiveSection('announcements')}
            />
            <SideNavItem
              icon={Receipt}
              label="امور مالی"
              active={activeSection === 'financials'}
              onClick={() => setActiveSection('financials')}
            />
            <SideNavItem
              icon={PieChart}
              label="گزارش مالی"
              active={activeSection === 'reports'}
              onClick={() => setActiveSection('reports')}
            />
            <SideNavItem
              icon={Users}
              label="کاربران"
              active={activeSection === 'users'}
              onClick={() => setActiveSection('users')}
            />
          </nav>

          <AdminProfile user={authState.user} onLogout={handleLogout} />
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-teal-700">
                  <ShieldCheck className="h-4 w-4" />
                  پنل مدیر
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {pageTitle}
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
              <MobileTab
                active={activeSection === 'requests'}
                onClick={() => setActiveSection('requests')}
                label="درخواست‌ها"
              />
              <MobileTab
                active={activeSection === 'serviceReports'}
                onClick={() => setActiveSection('serviceReports')}
                label="گزارش خدمات"
              />
              <MobileTab
                active={activeSection === 'building'}
                onClick={() => setActiveSection('building')}
                label="ساختمان"
              />
              <MobileTab
                active={activeSection === 'units'}
                onClick={() => setActiveSection('units')}
                label="واحدها"
              />
              <MobileTab
                active={activeSection === 'amenities'}
                onClick={() => setActiveSection('amenities')}
                label="امکانات"
              />
              <MobileTab
                active={activeSection === 'announcements'}
                onClick={() => setActiveSection('announcements')}
                label="اطلاعیه‌ها"
              />
              <MobileTab
                active={activeSection === 'financials'}
                onClick={() => setActiveSection('financials')}
                label="امور مالی"
              />
              <MobileTab
                active={activeSection === 'reports'}
                onClick={() => setActiveSection('reports')}
                label="گزارش مالی"
              />
              <MobileTab
                active={activeSection === 'users'}
                onClick={() => setActiveSection('users')}
                label="کاربران"
              />
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
            {activeSection === 'requests' ? (
              <ServiceRequestsSection />
            ) : activeSection === 'serviceReports' ? (
              <ServiceReportsSection />
            ) : activeSection === 'building' ? (
              <BuildingSettingsSection />
            ) : activeSection === 'units' ? (
              <UnitsSection users={userData.users} />
            ) : activeSection === 'amenities' ? (
              <AmenitiesSection />
            ) : activeSection === 'announcements' ? (
              <AnnouncementsSection />
            ) : activeSection === 'financials' ? (
              <FinancialsSection />
            ) : activeSection === 'reports' ? (
              <ReportsSection />
            ) : (
              <UsersSection
                data={userData}
                authState={authState}
                actionState={actionState}
                changeRole={changeRole}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
