import { Crown, LogOut, Search, Settings, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { useForm } from '../../hooks/useForm'
import { authApi, managerApi } from '../../lib/api'
import { validateAdminProfile } from '../../lib/validators'
import { roleLabels } from '../../utils/constants'
import { BrandMark } from '../../components/ui/BrandMark'
import { MobileTab } from '../../components/ui/MobileTab'
import { SideNavItem } from '../../components/ui/SideNavItem'
import { AdminProfile } from './admin/AdminProfile'
import { RolesSection } from './admin/RolesSection'
import { SettingsSection } from './admin/SettingsSection'

export function AdminDashboardPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [activeSection, setActiveSection] = useState('roles')
  const [data, setData] = useState({ users: [], stats: null, loading: true, error: '' })
  const [search, setSearch] = useState('')
  const [actionState, setActionState] = useState({})

  const profileForm = useForm({
    initialValues: {
      full_name: authState.user.full_name || '',
      username: authState.user.username || '',
      phone: authState.user.phone || '',
      national_id: authState.user.national_id || '',
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
    validate: validateAdminProfile,
    onSubmit: async (values) => {
      const response = await authApi.updateAdminProfile(values)
      setAuthState({ loading: false, user: response.user })
      setData((current) => ({
        ...current,
        users: current.users.map((item) => (item.id === response.user.id ? { ...item, ...response.user } : item)),
      }))
      profileForm.setValues({
        full_name: response.user.full_name || '',
        username: response.user.username || '',
        phone: response.user.phone || '',
        national_id: response.user.national_id || '',
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      })
      showToast(response.message || 'اطلاعات حساب با موفقیت ذخیره شد.')
    },
  })

  useEffect(() => {
    let active = true
    managerApi
      .users()
      .then((response) => active && setData({ users: response.users, stats: response.stats, loading: false, error: '' }))
      .catch((error) => active && setData((current) => ({ ...current, loading: false, error: error.message })))
    return () => {
      active = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return data.users
    return data.users.filter((user) =>
      [user.full_name, user.username, user.phone, user.national_id, roleLabels[user.role], user.id].some((field) => String(field ?? '').toLowerCase().includes(value)),
    )
  }, [data.users, search])

  async function handleLogout() {
    await authApi.logout()
    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    navigate('/login', { replace: true })
  }

  async function changeRole(user, role) {
    setActionState((current) => ({ ...current, [`role-${user.id}`]: true }))
    try {
      const response = await managerApi.updateUserRole(user.id, { role })
      setData((current) => ({
        ...current,
        users: current.users.map((item) => (item.id === user.id ? response.user : item)),
        stats: {
          total: current.users.length,
          managers: current.users.map((item) => (item.id === user.id ? response.user : item)).filter((item) => item.role === 'manager').length,
          residents: current.users.map((item) => (item.id === user.id ? response.user : item)).filter((item) => item.role === 'resident').length,
        },
      }))
      showToast(response.message)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionState((current) => ({ ...current, [`role-${user.id}`]: false }))
    }
  }

  const pageTitle = activeSection === 'roles' ? 'تغییر نقش‌ها' : 'تنظیمات'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-l border-white/10 bg-slate-950 p-5 text-white xl:flex">
          <div className="rounded-[1.5rem] bg-white/5 p-4 ring-1 ring-white/10">
            <BrandMark dark compact />
          </div>

          <nav className="mt-7 flex flex-1 flex-col gap-2">
            <SideNavItem icon={Users} label="تغییر نقش‌ها" active={activeSection === 'roles'} onClick={() => setActiveSection('roles')} />
            <SideNavItem icon={Settings} label="تنظیمات" active={activeSection === 'settings'} onClick={() => setActiveSection('settings')} />
          </nav>

          <AdminProfile user={authState.user} onLogout={handleLogout} />
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-teal-700">
                    <Crown className="h-4 w-4" />
                    پنل ادمین
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{pageTitle}</h1>
                </div>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 xl:hidden" type="button" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  خروج
                </button>
              </div>

              {activeSection === 'roles' ? (
                <div className="relative w-full sm:w-96">
                  <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-4 text-sm font-medium outline-none shadow-sm transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                    placeholder="جستجوی نام، نام کاربری، موبایل یا کد ملی"
                    type="text"
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2 xl:hidden">
              <MobileTab active={activeSection === 'roles'} onClick={() => setActiveSection('roles')} label="تغییر نقش‌ها" />
              <MobileTab active={activeSection === 'settings'} onClick={() => setActiveSection('settings')} label="تنظیمات" />
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
            {activeSection === 'roles' ? (
              <RolesSection data={data} filteredUsers={filteredUsers} search={search} setSearch={setSearch} authState={authState} actionState={actionState} changeRole={changeRole} />
            ) : (
              <SettingsSection user={authState.user} profileForm={profileForm} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}