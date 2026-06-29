import {
  BadgeCheck,
  Bell,
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

function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  )
}

function AppRoutes() {
  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
  })

  useEffect(() => {
    let active = true

    authApi
      .me()
      .then((data) => {
        if (active) {
          setAuthState({ loading: false, user: data.user })
        }
      })
      .catch(() => {
        if (active) {
          setAuthState({ loading: false, user: null })
        }
      })

    return () => {
      active = false
    }
  }, [])

  if (authState.loading) {
    return <FullscreenLoader />
  }

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
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9ff] px-6">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 text-slate-900 shadow-sm">
        <LoaderCircle className="h-5 w-5 animate-spin text-teal-700" />
        <span className="text-sm font-medium">در حال بارگذاری...</span>
      </div>
    </div>
  )
}

function AuthPageShell({ children }) {
  return (
    <div className="min-h-screen bg-[#f8f9ff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1440px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[420px_1fr]">
        <aside className="hidden border-l border-slate-200 bg-[#091426] p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-slate-800 text-teal-200">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <div className="text-[28px] font-extrabold text-[#89f5e7]">سامانه ساکن</div>
              <div className="text-sm text-slate-300">مدیریت هوشمند مجتمع</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="mb-2 text-sm text-slate-300">نسخه پنل</div>
              <div className="text-2xl font-bold">Account Access</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm leading-7 text-slate-300">طراحی پنل بر اساس تم مرجع با ساختار روشن، رسمی و خوانا برای رابط فارسی.</div>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center bg-[#f8f9ff] p-6 sm:p-8 lg:p-12">{children}</main>
      </div>
    </div>
  )
}

function LoginPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const form = useForm({
    initialValues: { phone: '', password: '' },
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
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#091426]">ورود</h1>
        </div>

        <form className="space-y-5" onSubmit={form.handleSubmit}>
          <InputField label="شماره موبایل" name="phone" type="tel" value={form.values.phone} onChange={form.handleChange} error={form.errors.phone} placeholder="09120000000" />
          <InputField label="گذرواژه" name="password" type="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} placeholder="••••••••" />

          <ServerError error={form.serverError} />

          <button className="flex h-12 w-full items-center justify-center rounded-lg bg-[#091426] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70" type="submit" disabled={form.loading}>
            {form.loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'ورود به سامانه'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-5 text-center">
          <a className="text-sm font-medium text-teal-700 hover:underline" href="/register">
            ایجاد حساب جدید
          </a>
        </div>
      </div>
    </AuthPageShell>
  )
}

function RegisterPage({ authState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const form = useForm({
    initialValues: {
      full_name: '',
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
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#091426]">ثبت‌نام</h1>
        </div>

        <form className="space-y-5" onSubmit={form.handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <InputField label="نام و نام خانوادگی" name="full_name" type="text" value={form.values.full_name} onChange={form.handleChange} error={form.errors.full_name} placeholder="مثلاً علی رضایی" />
            <InputField label="شماره موبایل" name="phone" type="tel" value={form.values.phone} onChange={form.handleChange} error={form.errors.phone} placeholder="09120000000" />
            <InputField label="کد ملی" name="national_id" type="text" value={form.values.national_id} onChange={form.handleChange} error={form.errors.national_id} placeholder="1234567890" />
            <InputField label="گذرواژه" name="password" type="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} placeholder="حداقل 8 کاراکتر" />
          </div>
          <InputField label="تکرار گذرواژه" name="password_confirmation" type="password" value={form.values.password_confirmation} onChange={form.handleChange} error={form.errors.password_confirmation} placeholder="تکرار گذرواژه" />

          <ServerError error={form.serverError} />

          <button className="flex h-12 w-full items-center justify-center rounded-lg bg-[#091426] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70" type="submit" disabled={form.loading}>
            {form.loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'ایجاد حساب کاربری'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-5 text-center">
          <a className="text-sm font-medium text-teal-700 hover:underline" href="/login">
            ورود به حساب
          </a>
        </div>
      </div>
    </AuthPageShell>
  )
}

function InputField({ label, name, type, value, onChange, error, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`h-12 w-full rounded-lg border bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 ${error ? 'border-rose-300' : 'border-slate-300'}`}
      />
      {error ? <small className="mt-2 block text-xs text-rose-600">{error}</small> : null}
    </label>
  )
}

function ServerError({ error }) {
  if (!error) return null
  return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
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
    <div className="min-h-screen bg-[#f8f9ff] p-8">
      <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#091426]">{roleTitle}</h1>
          </div>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50" type="button" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            خروج
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MiniInfoCard label="نام" value={authState.user.full_name} icon={UserRound} />
          <MiniInfoCard label="شماره موبایل" value={authState.user.phone} icon={Users} />
          <MiniInfoCard label="نقش" value={authState.user.role === 'manager' ? 'مدیر' : 'ساکن'} icon={ShieldCheck} />
        </div>
      </div>
    </div>
  )
}

function AdminDashboardPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [data, setData] = useState({ users: [], stats: null, loading: true, error: '' })
  const [search, setSearch] = useState('')
  const [actionState, setActionState] = useState({})

  const passwordForm = useForm({
    initialValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
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
      .then((response) => {
        if (active) {
          setData({ users: response.users, stats: response.stats, loading: false, error: '' })
        }
      })
      .catch((error) => {
        if (active) {
          setData((current) => ({ ...current, loading: false, error: error.message }))
        }
      })
    return () => {
      active = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return data.users
    return data.users.filter((user) =>
      [user.full_name, user.phone, user.national_id].some((field) => String(field).toLowerCase().includes(value)),
    )
  }, [data.users, search])

  async function handleLogout() {
    await authApi.logout()
    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    navigate('/login', { replace: true })
  }

  async function toggleStatus(user) {
    setActionState((current) => ({ ...current, [`status-${user.id}`]: true }))
    try {
      const shouldDisable = user.status === 'active'
      const response = await managerApi.updateUserStatus(user.id, { is_disabled: shouldDisable })
      setData((current) => ({
        ...current,
        users: current.users.map((item) => (item.id === user.id ? response.user : item)),
        stats: {
          total: current.stats.total,
          active: shouldDisable ? current.stats.active - 1 : current.stats.active + 1,
          disabled: shouldDisable ? current.stats.disabled + 1 : current.stats.disabled - 1,
        },
      }))
      showToast(response.message)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionState((current) => ({ ...current, [`status-${user.id}`]: false }))
    }
  }

  async function changeRole(user, role) {
    setActionState((current) => ({ ...current, [`role-${user.id}`]: true }))
    try {
      const response = await managerApi.updateUserRole(user.id, { role })
      setData((current) => ({
        ...current,
        users: current.users.map((item) => (item.id === user.id ? response.user : item)),
      }))
      showToast(response.message)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setActionState((current) => ({ ...current, [`role-${user.id}`]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-l border-slate-800 bg-[#091426] p-4 text-white xl:flex">
          <div className="mt-4 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-[#89f5e7]">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[28px] font-extrabold text-[#89f5e7]">سامانه ساکن</div>
              <div className="text-xs text-slate-300">مدیریت هوشمند مجتمع</div>
            </div>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-2">
            <SideNavItem icon={Users} label="مدیریت کاربران" active />
            <SideNavItem icon={ShieldCheck} label="دسترسی‌ها" />
            <SideNavItem icon={Settings} label="تنظیمات" />
          </nav>

          <div className="mt-auto border-t border-slate-700 pt-4">
            <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white" type="button" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              خروج
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-[#f8f9ff] px-8 shadow-sm">
            <h1 className="text-[32px] font-bold text-[#091426]">مدیریت کاربران</h1>
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 w-72 rounded-full border border-slate-300 bg-[#eff4ff] pr-10 pl-4 text-sm outline-none transition focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                  placeholder="جستجو..."
                  type="text"
                />
              </div>
              <button className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-200/70">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-600" />
              </button>
              <button className="rounded-full p-2 text-slate-600 transition hover:bg-slate-200/70">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="space-y-6 p-8">
            <div className="grid gap-6 md:grid-cols-3">
              <SummaryCard title="کل کاربران" value={data.stats?.total ?? '—'} icon={Users} tone="teal" />
              <SummaryCard title="کاربران فعال" value={data.stats?.active ?? '—'} icon={BadgeCheck} tone="navy" />
              <SummaryCard title="کاربران غیرفعال" value={data.stats?.disabled ?? '—'} icon={ShieldCheck} tone="rose" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                  <h2 className="text-2xl font-semibold text-[#091426]">فهرست کاربران</h2>
                  <div className="text-sm text-slate-500">{filteredUsers.length} کاربر</div>
                </div>

                {data.loading ? (
                  <div className="flex items-center justify-center gap-3 px-6 py-16 text-slate-500">
                    <LoaderCircle className="h-5 w-5 animate-spin text-teal-700" />
                    در حال بارگذاری...
                  </div>
                ) : data.error ? (
                  <div className="p-6">
                    <ServerError error={data.error} />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-right">
                      <thead className="border-b border-slate-200 bg-[#eff4ff] text-sm text-slate-600">
                        <tr>
                          <th className="px-6 py-4 font-semibold">کاربر</th>
                          <th className="px-6 py-4 font-semibold">شماره موبایل</th>
                          <th className="px-6 py-4 font-semibold">کد ملی</th>
                          <th className="px-6 py-4 font-semibold">نقش</th>
                          <th className="px-6 py-4 font-semibold">وضعیت</th>
                          <th className="px-6 py-4 font-semibold">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm text-slate-900">
                        {filteredUsers.map((user) => {
                          const isSelf = user.id === authState.user.id
                          const statusLoading = Boolean(actionState[`status-${user.id}`])
                          const roleLoading = Boolean(actionState[`role-${user.id}`])
                          const isAdmin = user.role === 'admin'
                          return (
                            <tr key={user.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                <div className="font-semibold">{user.full_name}</div>
                                <div className="mt-1 text-xs text-slate-500">شناسه: {user.id}</div>
                              </td>
                              <td className="px-6 py-4 font-medium">{user.phone}</td>
                              <td className="px-6 py-4 font-medium">{user.national_id}</td>
                              <td className="px-6 py-4">
                                <RoleBadge role={user.role} />
                              </td>
                              <td className="px-6 py-4">
                                <StatusBadge status={user.status} />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleStatus(user)}
                                    disabled={isSelf || statusLoading}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                                  >
                                    {statusLoading ? '...' : user.status === 'active' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                                  </button>

                                  {!isAdmin ? (
                                    <button
                                      type="button"
                                      onClick={() => changeRole(user, user.role === 'resident' ? 'manager' : 'resident')}
                                      disabled={roleLoading}
                                      className="rounded-lg bg-[#006a61] px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                                    >
                                      {roleLoading ? '...' : user.role === 'resident' ? 'تبدیل به مدیر' : 'تبدیل به ساکن'}
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white">ادمین</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-6 py-5">
                    <h2 className="text-2xl font-semibold text-[#091426]">تغییر رمز عبور ادمین</h2>
                  </div>
                  <form className="space-y-5 p-6" onSubmit={passwordForm.handleSubmit}>
                    <InputField label="رمز فعلی" name="current_password" type="password" value={passwordForm.values.current_password} onChange={passwordForm.handleChange} error={passwordForm.errors.current_password} placeholder="رمز فعلی" />
                    <InputField label="رمز جدید" name="new_password" type="password" value={passwordForm.values.new_password} onChange={passwordForm.handleChange} error={passwordForm.errors.new_password} placeholder="رمز جدید" />
                    <InputField label="تکرار رمز جدید" name="new_password_confirmation" type="password" value={passwordForm.values.new_password_confirmation} onChange={passwordForm.handleChange} error={passwordForm.errors.new_password_confirmation} placeholder="تکرار رمز جدید" />
                    <ServerError error={passwordForm.serverError} />
                    <button className="flex h-12 w-full items-center justify-center rounded-lg bg-[#091426] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70" type="submit" disabled={passwordForm.loading}>
                      {passwordForm.loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'ذخیره رمز جدید'}
                    </button>
                  </form>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#eff4ff] text-[#091426]">
                      <UserCog className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#091426]">کاربر جاری</div>
                      <div className="text-sm text-slate-500">{authState.user.full_name}</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function SideNavItem({ icon: Icon, label, active = false }) {
  return (
    <div className={`relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${active ? 'bg-slate-800 text-[#89f5e7]' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
      {active ? <div className="absolute inset-y-0 right-0 w-1 rounded-l-full bg-[#89f5e7]" /> : null}
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </div>
  )
}

function SummaryCard({ title, value, icon: Icon, tone }) {
  const tones = {
    teal: 'bg-[#86f2e4]/25 text-[#006a61]',
    navy: 'bg-[#d8e3fb] text-[#091426]',
    rose: 'bg-[#ffdad6] text-[#ba1a1a]',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm text-slate-500">{title}</p>
          <h3 className="text-4xl font-bold text-[#091426]">{value}</h3>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function MiniInfoCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#f8f9ff] p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#091426] shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-[#091426]">{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const active = status === 'active'
  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${active ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
      {active ? 'فعال' : 'غیرفعال'}
    </span>
  )
}

function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-slate-900 text-white',
    manager: 'bg-[#d8e3fb] text-[#091426]',
    resident: 'bg-slate-100 text-slate-700',
  }
  const labels = {
    admin: 'ادمین',
    manager: 'مدیر',
    resident: 'ساکن',
  }
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${styles[role]}`}>{labels[role]}</span>
}

export default App
