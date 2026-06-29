import {
  BadgeCheck,
  Crown,
  LoaderCircle,
  LogOut,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import { ToastProvider, useToast } from './components/ToastProvider'
import { useForm } from './hooks/useForm'
import { authApi, managerApi } from './lib/api'
import { validateAdminPasswordChange, validateLogin, validateRegister } from './lib/validators'

const roleLabels = {
  admin: 'ادمین',
  manager: 'مدیر',
  resident: 'ساکن',
}

function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  )
}

function AppRoutes() {
  const [authState, setAuthState] = useState({ loading: true, user: null })

  useEffect(() => {
    let active = true
    authApi
      .me()
      .then((data) => active && setAuthState({ loading: false, user: data.user }))
      .catch(() => active && setAuthState({ loading: false, user: null }))
    return () => {
      active = false
    }
  }, [])

  if (authState.loading) return <FullscreenLoader />

  return (
    <Routes>
      <Route path="/" element={<Navigate to={resolveHomePath(authState.user)} replace />} />
      <Route path="/login" element={<LoginPage authState={authState} setAuthState={setAuthState} />} />
      <Route path="/register" element={<RegisterPage authState={authState} />} />
      <Route
        path="/resident/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={['resident']}>
            <RolePlaceholderPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={['manager']}>
            <RolePlaceholderPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={['admin']}>
            <AdminDashboardPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function resolveHomePath(user) {
  if (!user) return '/login'
  if (user.role === 'resident') return '/resident/dashboard'
  if (user.role === 'manager') return '/manager/dashboard'
  return '/admin/dashboard'
}

function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to={resolveHomePath(user)} replace />
  return children
}

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-800 shadow-lg shadow-slate-200/60">
        <LoaderCircle className="h-5 w-5 animate-spin text-teal-600" />
        <span className="text-sm font-semibold">در حال بارگذاری...</span>
      </div>
    </div>
  )
}

function BrandMark({ dark = false, compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center rounded-2xl ${compact ? 'h-11 w-11' : 'h-14 w-14'} ${dark ? 'bg-white/10 text-teal-200 ring-1 ring-white/15' : 'bg-slate-900 text-teal-300 shadow-lg shadow-slate-300/50'}`}>
        <Shield className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
      </div>
      <div>
        <div className={`${compact ? 'text-xl' : 'text-2xl'} font-black tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}>سامانه ساکن</div>
        <div className={`mt-0.5 text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-500'}`}>مدیریت مجتمع مسکونی</div>
      </div>
    </div>
  )
}

function AuthPageShell({ children }) {
  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </div>
  )
}

function LoginPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const form = useForm({
    initialValues: { login: '', password: '' },
    validate: validateLogin,
    onSubmit: async (values) => {
      const data = await authApi.login(values)
      setAuthState({ loading: false, user: data.user })
      showToast('با موفقیت وارد شدید.')
      navigate(resolveHomePath(data.user), { replace: true })
    },
  })

  if (authState.user) return <Navigate to={resolveHomePath(authState.user)} replace />

  return (
    <AuthPageShell>
      <AuthCard title="ورود" description="با نام کاربری، شماره موبایل یا کد ملی وارد شوید.">
        <form className="space-y-5" onSubmit={form.handleSubmit}>
          <InputField label="نام کاربری، شماره موبایل یا کد ملی" name="login" type="text" value={form.values.login} onChange={form.handleChange} error={form.errors.login} placeholder="مثلاً admin یا 09120000000" />
          <InputField label="گذرواژه" name="password" type="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} placeholder="گذرواژه" />
          <ServerError error={form.serverError} />
          <PrimaryButton loading={form.loading}>ورود به سامانه</PrimaryButton>
        </form>
        <AuthSwitch text="حساب کاربری ندارید؟" href="/register" label="ثبت‌نام کنید" />
      </AuthCard>
    </AuthPageShell>
  )
}

function RegisterPage({ authState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const form = useForm({
    initialValues: {
      full_name: '',
      username: '',
      phone: '',
      national_id: '',
      password: '',
      password_confirmation: '',
    },
    validate: validateRegister,
    onSubmit: async (values) => {
      await authApi.register(values)
      showToast('ثبت‌نام با موفقیت انجام شد.')
      navigate('/login', { replace: true })
    },
  })

  if (authState.user) return <Navigate to={resolveHomePath(authState.user)} replace />

  return (
    <AuthPageShell>
      <AuthCard title="ثبت‌نام" description="اطلاعات خود را وارد کنید. نام کاربری اختیاری است و در صورت خالی بودن، شماره موبایل جایگزین می‌شود." wide>
        <form className="space-y-5" onSubmit={form.handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <InputField label="نام و نام خانوادگی" name="full_name" type="text" value={form.values.full_name} onChange={form.handleChange} error={form.errors.full_name} placeholder="مثلاً علی رضایی" />
            <InputField label="نام کاربری" name="username" type="text" value={form.values.username} onChange={form.handleChange} error={form.errors.username} placeholder="اختیاری" />
            <InputField label="شماره موبایل" name="phone" type="tel" value={form.values.phone} onChange={form.handleChange} error={form.errors.phone} placeholder="09120000000" />
            <InputField label="کد ملی" name="national_id" type="text" value={form.values.national_id} onChange={form.handleChange} error={form.errors.national_id} placeholder="1234567890" />
            <InputField label="گذرواژه" name="password" type="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} placeholder="حداقل ۸ کاراکتر" />
            <InputField label="تکرار گذرواژه" name="password_confirmation" type="password" value={form.values.password_confirmation} onChange={form.handleChange} error={form.errors.password_confirmation} placeholder="تکرار گذرواژه" />
          </div>
          <ServerError error={form.serverError} />
          <PrimaryButton loading={form.loading}>ایجاد حساب کاربری</PrimaryButton>
        </form>
        <AuthSwitch text="قبلاً ثبت‌نام کرده‌اید؟" href="/login" label="وارد شوید" />
      </AuthCard>
    </AuthPageShell>
  )
}

function AuthCard({ title, description, children, wide = false }) {
  return (
    <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
      <div className="mb-8 flex justify-center">
        <BrandMark />
      </div>
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

function AuthSwitch({ text, href, label }) {
  return (
    <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-center text-sm text-slate-600">
      {text}{' '}
      <a className="font-bold text-teal-700 transition hover:text-teal-800" href={href}>
        {label}
      </a>
    </div>
  )
}

function InputField({ label, name, type, value, onChange, error, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : 'off'}
        className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}
      />
      {error ? <small className="mt-2 block text-xs font-medium text-rose-600">{error}</small> : null}
    </label>
  )
}

function PrimaryButton({ children, loading, type = 'submit', onClick, className = '' }) {
  return (
    <button
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-300/70 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      type={type}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : children}
    </button>
  )
}

function ServerError({ error }) {
  if (!error) return null
  return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium leading-7 text-rose-700">{error}</div>
}

function RolePlaceholderPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  async function handleLogout() {
    await authApi.logout()
    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    navigate('/login', { replace: true })
  }

  const roleTitle = authState.user.role === 'manager' ? 'پنل مدیر' : 'پنل ساکن'

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="panel-hero p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <BrandMark dark />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15" type="button" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
          <div className="mt-10 max-w-2xl">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{roleTitle}</h1>
            <p className="mt-3 text-sm leading-8 text-slate-300">خوش آمدید؛ اطلاعات حساب و دسترسی‌های اصلی شما در این بخش نمایش داده می‌شود.</p>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:p-8 md:grid-cols-3">
          <MiniInfoCard label="نام" value={authState.user.full_name} icon={UserRound} />
          <MiniInfoCard label="شماره موبایل" value={authState.user.phone} icon={Users} />
          <MiniInfoCard label="نقش" value={roleLabels[authState.user.role]} icon={ShieldCheck} />
        </div>
      </div>
    </div>
  )
}

function AdminDashboardPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [activeSection, setActiveSection] = useState('roles')
  const [data, setData] = useState({ users: [], stats: null, loading: true, error: '' })
  const [search, setSearch] = useState('')
  const [actionState, setActionState] = useState({})

  const passwordForm = useForm({
    initialValues: { current_password: '', new_password: '', new_password_confirmation: '' },
    validate: validateAdminPasswordChange,
    onSubmit: async (values) => {
      await authApi.changeAdminPassword(values)
      showToast('رمز عبور ادمین با موفقیت تغییر کرد.')
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
              <SettingsSection user={authState.user} passwordForm={passwordForm} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function RolesSection({ data, filteredUsers, search, setSearch, authState, actionState, changeRole }) {
  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">مدیریت نقش‌ها</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">تعیین نقش کاربران سامانه</h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">در این بخش فقط نقش کاربران غیرادمین بین «ساکن» و «مدیر» تغییر می‌کند.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="کل کاربران" value={data.stats?.total ?? '—'} icon={Users} tone="teal" />
        <SummaryCard title="مدیرها" value={data.stats?.managers ?? '—'} icon={ShieldCheck} tone="emerald" />
        <SummaryCard title="ساکن‌ها" value={data.stats?.residents ?? '—'} icon={BadgeCheck} tone="blue" />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">فهرست کاربران</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredUsers.length} کاربر نمایش داده شده است.</p>
          </div>
          {search ? <button type="button" onClick={() => setSearch('')} className="self-start rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 sm:self-auto">پاک کردن جستجو</button> : null}
        </div>

        {data.loading ? (
          <LoadingBlock />
        ) : data.error ? (
          <div className="p-6"><ServerError error={data.error} /></div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">کاربر</th>
                  <th className="px-6 py-4">نام کاربری</th>
                  <th className="px-6 py-4">شماره موبایل</th>
                  <th className="px-6 py-4">کد ملی</th>
                  <th className="px-6 py-4">نقش فعلی</th>
                  <th className="px-6 py-4">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === authState.user.id
                  const roleLoading = Boolean(actionState[`role-${user.id}`])
                  const isAdmin = user.role === 'admin'
                  return (
                    <tr key={user.id} className="transition hover:bg-slate-50/70">
                      <td className="px-6 py-4"><UserCell user={user} isSelf={isSelf} /></td>
                      <td className="px-6 py-4 font-bold" dir="ltr">{user.username || '—'}</td>
                      <td className="px-6 py-4 font-bold" dir="ltr">{user.phone}</td>
                      <td className="px-6 py-4 font-bold" dir="ltr">{user.national_id}</td>
                      <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-6 py-4">
                        {!isAdmin ? (
                          <button
                            type="button"
                            onClick={() => changeRole(user, user.role === 'resident' ? 'manager' : 'resident')}
                            disabled={roleLoading || isSelf}
                            title={isSelf ? 'امکان تغییر نقش حساب جاری وجود ندارد.' : undefined}
                            className="inline-flex h-10 items-center justify-center rounded-2xl bg-teal-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {roleLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : user.role === 'resident' ? 'تبدیل به مدیر' : 'تبدیل به ساکن'}
                          </button>
                        ) : (
                          <span className="inline-flex h-10 items-center rounded-2xl bg-slate-950 px-4 text-xs font-bold text-white">ادمین</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function SettingsSection({ user, passwordForm }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-black text-slate-950">تغییر رمز عبور ادمین</h2>
          <p className="mt-1 text-sm text-slate-500">این بخش فقط در تنظیمات نمایش داده می‌شود.</p>
        </div>
        <form className="space-y-5 p-6" onSubmit={passwordForm.handleSubmit}>
          <InputField label="رمز فعلی" name="current_password" type="password" value={passwordForm.values.current_password} onChange={passwordForm.handleChange} error={passwordForm.errors.current_password} placeholder="رمز فعلی" />
          <InputField label="رمز جدید" name="new_password" type="password" value={passwordForm.values.new_password} onChange={passwordForm.handleChange} error={passwordForm.errors.new_password} placeholder="رمز جدید" />
          <InputField label="تکرار رمز جدید" name="new_password_confirmation" type="password" value={passwordForm.values.new_password_confirmation} onChange={passwordForm.handleChange} error={passwordForm.errors.new_password_confirmation} placeholder="تکرار رمز جدید" />
          <ServerError error={passwordForm.serverError} />
          <PrimaryButton loading={passwordForm.loading}>ذخیره رمز جدید</PrimaryButton>
        </form>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
        <h2 className="text-xl font-black text-slate-950">اطلاعات حساب</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <MiniInfoCard label="نام" value={user.full_name} icon={UserRound} />
          <MiniInfoCard label="نام کاربری" value={user.username || '—'} icon={UserCog} />
          <MiniInfoCard label="شماره موبایل" value={user.phone} icon={Users} />
          <MiniInfoCard label="نقش" value={roleLabels[user.role]} icon={ShieldCheck} />
        </div>
      </div>
    </section>
  )
}

function AdminProfile({ user, onLogout }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-300/15 text-teal-200">
          <UserCog className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{user.full_name}</div>
          <div className="text-xs text-slate-400">{roleLabels[user.role]}</div>
        </div>
      </div>
      <button className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-bold text-slate-100 transition hover:bg-white/15" type="button" onClick={onLogout}>
        <LogOut className="h-4 w-4" />
        خروج
      </button>
    </div>
  )
}

function MobileTab({ active, onClick, label }) {
  return (
    <button type="button" onClick={onClick} className={`h-10 rounded-2xl px-4 text-xs font-black transition ${active ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
      {label}
    </button>
  )
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm font-bold text-slate-500">
      <LoaderCircle className="h-5 w-5 animate-spin text-teal-600" />
      در حال بارگذاری...
    </div>
  )
}

function EmptyState() {
  return (
    <div className="px-6 py-20 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Search className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-900">کاربری پیدا نشد</h3>
      <p className="mt-2 text-sm text-slate-500">عبارت جستجو را تغییر دهید و دوباره تلاش کنید.</p>
    </div>
  )
}

function UserCell({ user, isSelf }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <UserRound className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-black text-slate-950">{user.full_name}</span>
          {isSelf ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-700">شما</span> : null}
        </div>
        <div className="mt-1 text-xs font-medium text-slate-400">شناسه: {user.id}</div>
      </div>
    </div>
  )
}

function SideNavItem({ icon: Icon, label, active = false, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-white text-slate-950 shadow-lg shadow-black/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
      <Icon className={`h-5 w-5 ${active ? 'text-teal-600' : ''}`} />
      <span>{label}</span>
    </button>
  )
}

function SummaryCard({ title, value, icon: Icon, tone }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  }
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <h3 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</h3>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function MiniInfoCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-slate-200/70">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-bold text-slate-500">{label}</div>
      <div className="mt-2 break-words text-lg font-black text-slate-950">{value}</div>
    </div>
  )
}

function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-slate-950 text-white',
    manager: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    resident: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  }
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${styles[role]}`}>{roleLabels[role]}</span>
}

export default App
