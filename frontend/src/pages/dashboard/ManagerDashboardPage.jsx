import {
  Building2,
  Building,
  CalendarRange,
  ClipboardList,
  FileSpreadsheet,
  Landmark,
  LogOut,
  Megaphone,
  MessagesSquare,
  PieChart,
  Receipt,
  ShieldCheck,
  Vote,
  UserRound,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { AccountSettingsSection } from '../../components/dashboard/AccountSettingsSection'
import { BrandMark } from '../../components/ui/BrandMark'
import { MobileTab } from '../../components/ui/MobileTab'
import { SideNavItem } from '../../components/ui/SideNavItem'
import { useLogout } from '../../hooks/useLogout'
import { useManagerMessages } from '../../hooks/useManagerMessages'
import { useUserDirectory } from '../../hooks/useUserDirectory'
import { AdminProfile } from './admin/AdminProfile'
import { AmenitiesSection } from './manager/AmenitiesSection'
import { AmenityReportsSection } from './manager/AmenityReportsSection'
import { AnnouncementsSection } from './manager/AnnouncementsSection'
import { BuildingSettingsSection } from './manager/BuildingSettingsSection'
import { FinancialsSection } from './manager/FinancialsSection'
import { MessagesSection } from './manager/MessagesSection'
import { PollsSection } from './manager/PollsSection'
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
  amenityReports: 'گزارش رزرو امکانات',
  announcements: 'اطلاعیه‌ها',
  polls: 'نظرسنجی‌ها',
  messages: 'پیام‌ها',
  financials: 'امور مالی',
  reports: 'گزارش مالی',
  users: 'کاربران',
  account: 'حساب کاربری',
}

export function ManagerDashboardPage({ authState, setAuthState }) {
  const [activeSection, setActiveSection] = useState('requests')
  const { data: userData, actionState, changeRole } = useUserDirectory()
  const messages = useManagerMessages()

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
              icon={CalendarRange}
              label="گزارش رزرو امکانات"
              active={activeSection === 'amenityReports'}
              onClick={() => setActiveSection('amenityReports')}
            />
            <SideNavItem
              icon={Megaphone}
              label="اطلاعیه‌ها"
              active={activeSection === 'announcements'}
              onClick={() => setActiveSection('announcements')}
            />
            <SideNavItem
              icon={Vote}
              label="نظرسنجی‌ها"
              active={activeSection === 'polls'}
              onClick={() => setActiveSection('polls')}
            />
            <SideNavItem
              icon={MessagesSquare}
              label="پیام‌ها"
              active={activeSection === 'messages'}
              onClick={() => setActiveSection('messages')}
              badge={messages.unreadTotal || undefined}
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
            <SideNavItem
              icon={UserRound}
              label="حساب کاربری"
              active={activeSection === 'account'}
              onClick={() => setActiveSection('account')}
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
                active={activeSection === 'amenityReports'}
                onClick={() => setActiveSection('amenityReports')}
                label="گزارش رزرو"
              />
              <MobileTab
                active={activeSection === 'announcements'}
                onClick={() => setActiveSection('announcements')}
                label="اطلاعیه‌ها"
              />
              <MobileTab
                active={activeSection === 'polls'}
                onClick={() => setActiveSection('polls')}
                label="نظرسنجی‌ها"
              />
              <MobileTab
                active={activeSection === 'messages'}
                onClick={() => setActiveSection('messages')}
                label="پیام‌ها"
                badge={messages.unreadTotal || undefined}
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
              <MobileTab
                active={activeSection === 'account'}
                onClick={() => setActiveSection('account')}
                label="حساب کاربری"
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
            ) : activeSection === 'amenityReports' ? (
              <AmenityReportsSection />
            ) : activeSection === 'announcements' ? (
              <AnnouncementsSection />
            ) : activeSection === 'polls' ? (
              <PollsSection />
            ) : activeSection === 'messages' ? (
              <MessagesSection
                conversations={messages.conversations}
                loading={messages.loading}
                error={messages.error}
                retry={messages.retry}
                upsertConversations={messages.upsertConversations}
                markConversationRead={messages.markConversationRead}
                currentUserId={authState.user?.id}
              />
            ) : activeSection === 'financials' ? (
              <FinancialsSection />
            ) : activeSection === 'reports' ? (
              <ReportsSection />
            ) : activeSection === 'account' ? (
              <AccountSettingsSection
                user={authState.user}
                setAuthState={setAuthState}
                heading="ویرایش اطلاعات مدیر"
                description="اطلاعات حساب مدیریت را ویرایش کنید. برای تغییر رمز، رمز فعلی و رمز جدید را وارد کنید؛ در غیر این صورت فیلدهای رمز را خالی بگذارید."
              />
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
