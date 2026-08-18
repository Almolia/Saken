import { ClipboardList, LogOut, ShieldCheck, UserRound, Users, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useLogout } from '../../hooks/useLogout'
import { BrandMark } from '../../components/ui/BrandMark'
import { MiniInfoCard } from '../../components/ui/MiniInfoCard'
import { MobileTab } from '../../components/ui/MobileTab'
import { SideNavItem } from '../../components/ui/SideNavItem'
import { roleLabels } from '../../utils/constants'
import { AdminProfile } from './admin/AdminProfile'
import { StaffTasksSection } from './service/StaffTasksSection'

const sectionTitles = {
  tasks: 'وظایف من',
  account: 'حساب کاربری',
}

export function ServiceDashboardPage({ authState, setAuthState }) {
  const [activeSection, setActiveSection] = useState('tasks')

  const handleLogout = useLogout(setAuthState)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-l border-white/10 bg-slate-950 p-5 text-white xl:flex">
          <div className="rounded-[1.5rem] bg-white/5 p-4 ring-1 ring-white/10">
            <BrandMark dark compact />
          </div>

          <nav className="mt-7 flex flex-1 flex-col gap-2">
            <SideNavItem icon={ClipboardList} label="وظایف من" active={activeSection === 'tasks'} onClick={() => setActiveSection('tasks')} />
            <SideNavItem icon={UserRound} label="حساب کاربری" active={activeSection === 'account'} onClick={() => setActiveSection('account')} />
          </nav>

          <AdminProfile user={authState.user} onLogout={handleLogout} />
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-teal-700">
                  <Wrench className="h-4 w-4" />
                  پنل کارکنان خدمات
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{sectionTitles[activeSection]}</h1>
              </div>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 xl:hidden" type="button" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </div>

            <div className="mt-4 flex gap-2 xl:hidden">
              <MobileTab active={activeSection === 'tasks'} onClick={() => setActiveSection('tasks')} label="وظایف من" />
              <MobileTab active={activeSection === 'account'} onClick={() => setActiveSection('account')} label="حساب کاربری" />
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
            {activeSection === 'tasks' ? <StaffTasksSection user={authState.user} /> : <AccountSection user={authState.user} />}
          </div>
        </main>
      </div>
    </div>
  )
}

function AccountSection({ user }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MiniInfoCard label="نام" value={user.full_name} icon={UserRound} />
      <MiniInfoCard label="شماره موبایل" value={user.phone} icon={Users} />
      <MiniInfoCard label="نقش" value={roleLabels[user.role]} icon={ShieldCheck} />
    </div>
  )
}
