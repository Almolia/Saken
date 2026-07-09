import { Building2, LogOut, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { authApi, managerApi } from '../../lib/api'
import { BrandMark } from '../../components/ui/BrandMark'
import { MobileTab } from '../../components/ui/MobileTab'
import { SideNavItem } from '../../components/ui/SideNavItem'
import { AdminProfile } from './admin/AdminProfile'
import { UnitsSection } from './manager/UnitsSection'
import { UsersSection } from './manager/UsersSection'

export function ManagerDashboardPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [activeSection, setActiveSection] = useState('units')
  const [userData, setUserData] = useState({ users: [], stats: null, loading: true, error: '' })

  useEffect(() => {
    let active = true
    managerApi
      .users()
      .then((response) => active && setUserData({ users: response.users, stats: response.stats, loading: false, error: '' }))
      .catch((error) => active && setUserData((current) => ({ ...current, loading: false, error: error.message })))
    return () => {
      active = false
    }
  }, [])

  async function handleLogout() {
    await authApi.logout()
    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    navigate('/login', { replace: true })
  }

  const pageTitle = activeSection === 'units' ? 'مدیریت واحدها' : 'کاربران'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-l border-white/10 bg-slate-950 p-5 text-white xl:flex">
          <div className="rounded-[1.5rem] bg-white/5 p-4 ring-1 ring-white/10">
            <BrandMark dark compact />
          </div>

          <nav className="mt-7 flex flex-1 flex-col gap-2">
            <SideNavItem icon={Building2} label="مدیریت واحدها" active={activeSection === 'units'} onClick={() => setActiveSection('units')} />
            <SideNavItem icon={Users} label="کاربران" active={activeSection === 'users'} onClick={() => setActiveSection('users')} />
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
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{pageTitle}</h1>
              </div>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 xl:hidden" type="button" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </div>

            <div className="mt-4 flex gap-2 xl:hidden">
              <MobileTab active={activeSection === 'units'} onClick={() => setActiveSection('units')} label="مدیریت واحدها" />
              <MobileTab active={activeSection === 'users'} onClick={() => setActiveSection('users')} label="کاربران" />
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
            {activeSection === 'units' ? (
              <UnitsSection users={userData.users} />
            ) : (
              <UsersSection data={userData} authState={authState} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
