import {
  BadgeCheck,
  Building2,
  Crown,
  KeyRound,
  LoaderCircle,
  LogOut,
  Phone,
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
            <SimpleDashboardPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={['manager']}>
            <SimpleDashboardPage authState={authState} setAuthState={setAuthState} />
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
  if (!user) {
    return '/login'
  }
  if (user.role === 'resident') {
    return '/resident/dashboard'
  }
  if (user.role === 'manager') {
    return '/manager/dashboard'
  }
  return '/admin/dashboard'
}

function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={resolveHomePath(user)} replace />
  }

  return children
}

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="flex w-full max-w-md items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-white shadow-2xl backdrop-blur-xl">
        <LoaderCircle className="h-6 w-6 animate-spin text-sky-300" />
        <div>
          <div className="font-bold">در حال آماده‌سازی برنامه</div>
          <div className="mt-1 text-sm text-slate-300">لطفاً چند لحظه منتظر بمانید...</div>
        </div>
      </div>
    </div>
  )
}

function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_30px_120px_rgba(2,6,23,0.55)] backdrop-blur-2xl lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-sky-500 via-blue-700 to-slate-950 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/95">
              <Building2 className="h-4 w-4" />
              سامانه ساکن
            </div>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-md">
              <ShieldCheck className="h-4 w-4" />
              {eyebrow}
            </div>
            <h1 className="text-4xl font-black leading-[1.4] text-white xl:text-6xl">{title}</h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-100/90 xl:text-lg">{subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-white/90">
            <GlassStat icon={Users} label="مدیریت کاربران" value="پایدار و شفاف" />
            <GlassStat icon={UserCog} label="کنترل نقش‌ها" value="فقط توسط ادمین" />
            <GlassStat icon={KeyRound} label="امنیت ورود" value="رمز قدرتمند" />
            <GlassStat icon={BadgeCheck} label="تجربه کاربری" value="مدرن و حرفه‌ای" />
          </div>

          <div className="absolute -right-12 top-20 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-8 left-8 h-36 w-36 rounded-full bg-sky-300/20 blur-2xl" />
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8 xl:p-12">
          <div className="w-full max-w-xl">{children}</div>
        </section>
      </div>
    </div>
  )
}

function GlassStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
      <Icon className="mb-3 h-5 w-5 text-sky-100" />
      <div className="text-xs text-white/70">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
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

  if (authState.user) {
    return <Navigate to={resolveHomePath(authState.user)} replace />
  }

  return (
    <AuthShell
      eyebrow="ورود امن"
      title="ورود حرفه‌ای به پنل ساکن"
      subtitle="شماره موبایل و گذرواژه خود را وارد کنید تا وارد پنل متناسب با نقش خود شوید."
    >
      <AuthCard
        title="خوش برگشتید"
        subtitle="برای ادامه، اطلاعات حساب خود را وارد کنید."
        footer={<InlineLink href="/register" text="هنوز حساب ندارید؟ ایجاد حساب جدید" />}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit}>
          <InputField icon={Phone} label="شماره موبایل" name="phone" type="tel" value={form.values.phone} onChange={form.handleChange} error={form.errors.phone} placeholder="09120000000" />
          <InputField icon={KeyRound} label="گذرواژه" name="password" type="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} placeholder="مثلاً admin123" />

          <ServerError error={form.serverError} />

          <PrimaryButton loading={form.loading} text="ورود به سامانه" loadingText="در حال ورود..." />
        </form>
      </AuthCard>
    </AuthShell>
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
      showToast('ثبت‌نام با موفقیت انجام شد. اکنون وارد شوید.')
      navigate('/login', { replace: true })
    },
  })

  if (authState.user) {
    return <Navigate to={resolveHomePath(authState.user)} replace />
  }

  return (
    <AuthShell
      eyebrow="ثبت‌نام"
      title="ساخت حساب کاربری جدید"
      subtitle="حساب‌های جدید به صورت پیش‌فرض با نقش ساکن عادی ساخته می‌شوند و در صورت نیاز ادمین می‌تواند نقش آن‌ها را تغییر دهد."
    >
      <AuthCard
        title="ایجاد حساب"
        subtitle="اطلاعات زیر را با دقت وارد کنید."
        footer={<InlineLink href="/login" text="قبلاً ثبت‌نام کرده‌اید؟ ورود به حساب" />}
      >
        <form className="space-y-5" onSubmit={form.handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <InputField icon={UserRound} label="نام و نام خانوادگی" name="full_name" type="text" value={form.values.full_name} onChange={form.handleChange} error={form.errors.full_name} placeholder="مثلاً علی رضایی" />
            <InputField icon={Phone} label="شماره موبایل" name="phone" type="tel" value={form.values.phone} onChange={form.handleChange} error={form.errors.phone} placeholder="09120000000" />
            <InputField icon={BadgeCheck} label="کد ملی" name="national_id" type="text" value={form.values.national_id} onChange={form.handleChange} error={form.errors.national_id} placeholder="1234567890" />
            <InputField icon={KeyRound} label="گذرواژه" name="password" type="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} placeholder="حداقل 8 کاراکتر شامل حرف و عدد" />
          </div>

          <InputField icon={KeyRound} label="تکرار گذرواژه" name="password_confirmation" type="password" value={form.values.password_confirmation} onChange={form.handleChange} error={form.errors.password_confirmation} placeholder="تکرار گذرواژه" />

          <ServerError error={form.serverError} />

          <PrimaryButton loading={form.loading} text="ایجاد حساب کاربری" loadingText="در حال ثبت‌نام..." />
        </form>
      </AuthCard>
    </AuthShell>
  )
}

function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-white">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">{subtitle}</p>
      </div>
      {children}
      {footer ? <div className="mt-6 border-t border-white/10 pt-5">{footer}</div> : null}
    </div>
  )
}

function InlineLink({ href, text }) {
  return <a className="text-sm font-bold text-sky-300 transition hover:text-sky-200" href={href}>{text}</a>
}

function InputField({ icon: Icon, label, name, type, value, onChange, error, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2.5 block text-sm font-medium text-slate-200">{label}</span>
      <div className={`flex h-14 items-center gap-3 rounded-2xl border px-4 transition ${error ? 'border-rose-400/50 bg-rose-500/10' : 'border-white/10 bg-slate-900/70 hover:border-sky-400/30 focus-within:border-sky-400/60'}`}>
        <Icon className={`h-5 w-5 ${error ? 'text-rose-300' : 'text-slate-400'}`} />
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="h-full flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        />
      </div>
      {error ? <small className="mt-2 block text-xs text-rose-300">{error}</small> : null}
    </label>
  )
}

function ServerError({ error }) {
  if (!error) {
    return null
  }

  return <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
}

function PrimaryButton({ loading, text, loadingText }) {
  return (
    <button
      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-sky-900/30 transition hover:-translate-y-0.5 hover:from-sky-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
      type="submit"
      disabled={loading}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {loading ? loadingText : text}
    </button>
  )
}

function SimpleDashboardPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  async function handleLogout() {
    await authApi.logout()
    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    navigate('/login', { replace: true })
  }

  const roleConfig = {
    resident: {
      title: 'ساکن عادی',
      icon: UserRound,
      color: 'from-emerald-500/20 to-sky-500/10',
      note: 'این صفحه موقت ساکن است و بعداً با قابلیت‌های اصلی جایگزین می‌شود.',
    },
    manager: {
      title: 'مدیر',
      icon: UserCog,
      color: 'from-amber-500/20 to-sky-500/10',
      note: 'این صفحه موقت مدیر است و بعداً با داشبورد کامل مدیریتی توسعه داده می‌شود.',
    },
    admin: {
      title: 'ادمین',
      icon: Crown,
      color: 'from-fuchsia-500/20 to-sky-500/10',
      note: 'این صفحه برای ادمین استفاده نمی‌شود.',
    },
  }

  const current = roleConfig[authState.user.role]
  const RoleIcon = current.icon

  return (
    <DashboardLayout
      title={`داشبورد ${current.title}`}
      subtitle={current.note}
      user={authState.user}
      onLogout={handleLogout}
      badge={current.title}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className={`rounded-[2rem] border border-white/10 bg-gradient-to-br ${current.color} p-6 shadow-2xl backdrop-blur-xl sm:p-8`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">سلام {authState.user.full_name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-8 text-slate-200">{current.note}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <RoleIcon className="h-8 w-8 text-white" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <InfoCard icon={UserRound} label="نام" value={authState.user.full_name} />
          <InfoCard icon={Phone} label="شماره موبایل" value={authState.user.phone} />
          <InfoCard icon={BadgeCheck} label="کد ملی" value={authState.user.national_id} />
          <InfoCard icon={ShieldCheck} label="نقش" value={current.title} />
        </section>
      </div>
    </DashboardLayout>
  )
}

function AdminDashboardPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [data, setData] = useState({ users: [], stats: null, loading: true, error: '' })
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

  const visibleUsers = useMemo(() => data.users, [data.users])

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
    <DashboardLayout
      title="داشبورد ادمین"
      subtitle="در این بخش می‌توانید کاربران واقعی موجود در دیتابیس را مشاهده، نقش آن‌ها را بین مدیر و ساکن عادی تغییر دهید و دسترسی آن‌ها را مدیریت کنید."
      user={authState.user}
      onLogout={handleLogout}
      badge="مدیریت سیستم"
    >
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Users} label="کل کاربران" value={data.stats?.total ?? '—'} />
            <StatCard icon={BadgeCheck} label="کاربران فعال" value={data.stats?.active ?? '—'} />
            <StatCard icon={ShieldCheck} label="کاربران غیرفعال" value={data.stats?.disabled ?? '—'} />
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-lg font-extrabold text-white">کاربران موجود در دیتابیس</h2>
                <p className="mt-1 text-sm text-slate-400">نمایش مستقیم کاربران ثبت‌شده و مدیریت سطح دسترسی آن‌ها</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-200">
                <Users className="h-4 w-4" />
                {visibleUsers.length} کاربر نمایش داده شده
              </div>
            </div>

            {data.loading ? (
              <div className="flex items-center justify-center gap-3 px-6 py-16 text-slate-300">
                <LoaderCircle className="h-5 w-5 animate-spin text-sky-300" />
                در حال بارگذاری کاربران...
              </div>
            ) : null}

            {data.error ? <div className="p-6"><ServerError error={data.error} /></div> : null}

            {!data.loading && !data.error ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right">
                  <thead className="bg-white/5 text-xs text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-bold">کاربر</th>
                      <th className="px-6 py-4 font-bold">شماره موبایل</th>
                      <th className="px-6 py-4 font-bold">کد ملی</th>
                      <th className="px-6 py-4 font-bold">نقش</th>
                      <th className="px-6 py-4 font-bold">وضعیت</th>
                      <th className="px-6 py-4 font-bold">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((user) => {
                      const statusLoading = Boolean(actionState[`status-${user.id}`])
                      const roleLoading = Boolean(actionState[`role-${user.id}`])
                      const isSelf = authState.user.id === user.id
                      const isAdmin = user.role === 'admin'
                      return (
                        <tr key={user.id} className="border-t border-white/5 text-sm text-slate-200">
                          <td className="px-6 py-5">
                            <div className="flex min-w-[220px] items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-sky-200">
                                {user.role === 'admin' ? <Crown className="h-5 w-5" /> : user.role === 'manager' ? <UserCog className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                              </div>
                              <div>
                                <div className="font-bold text-white">{user.full_name}</div>
                                <div className="mt-1 text-xs text-slate-400">شناسه کاربر: {user.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">{user.phone}</td>
                          <td className="px-6 py-5">{user.national_id}</td>
                          <td className="px-6 py-5">
                            <RoleBadge role={user.role} />
                          </td>
                          <td className="px-6 py-5">
                            <StatusBadge status={user.status} />
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex min-w-[260px] flex-wrap gap-2">
                              <button
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                                onClick={() => toggleStatus(user)}
                                disabled={isSelf || statusLoading}
                              >
                                {statusLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                {user.status === 'active' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                              </button>

                              {!isAdmin ? (
                                <button
                                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                                  type="button"
                                  onClick={() => changeRole(user, user.role === 'resident' ? 'manager' : 'resident')}
                                  disabled={roleLoading}
                                >
                                  {roleLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
                                  {user.role === 'resident' ? 'تبدیل به مدیر' : 'تبدیل به ساکن'}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-xs font-bold text-fuchsia-100">
                                  <Crown className="h-4 w-4" />
                                  نقش ادمین ثابت است
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-sky-500/15 p-3 text-sky-200">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">تغییر رمز عبور ادمین</h2>
                <p className="mt-1 text-sm text-slate-400">رمز جدید باید حداقل 8 کاراکتر و شامل حرف انگلیسی و عدد باشد.</p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={passwordForm.handleSubmit}>
              <InputField icon={KeyRound} label="رمز فعلی" name="current_password" type="password" value={passwordForm.values.current_password} onChange={passwordForm.handleChange} error={passwordForm.errors.current_password} placeholder="رمز فعلی" />
              <InputField icon={KeyRound} label="رمز جدید" name="new_password" type="password" value={passwordForm.values.new_password} onChange={passwordForm.handleChange} error={passwordForm.errors.new_password} placeholder="حداقل 8 کاراکتر شامل حرف و عدد" />
              <InputField icon={KeyRound} label="تکرار رمز جدید" name="new_password_confirmation" type="password" value={passwordForm.values.new_password_confirmation} onChange={passwordForm.handleChange} error={passwordForm.errors.new_password_confirmation} placeholder="تکرار رمز جدید" />
              <ServerError error={passwordForm.serverError} />
              <PrimaryButton loading={passwordForm.loading} text="ذخیره رمز جدید" loadingText="در حال ذخیره..." />
            </form>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-sky-500/15 to-blue-700/10 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-white">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">سطح دسترسی ادمین</h3>
                <p className="mt-2 text-sm leading-7 text-slate-200">فقط ادمین مجاز است نقش کاربران را بین مدیر و ساکن عادی جابه‌جا کند. همچنین نقش ادمین قابل تغییر نیست.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

function DashboardLayout({ title, subtitle, badge, user, onLogout, children }) {
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5 shadow-2xl backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-200">
                <ShieldCheck className="h-4 w-4" />
                {badge}
              </div>
              <h1 className="mt-4 text-3xl font-black leading-[1.6] text-white sm:text-4xl">{title}</h1>
              <p className="mt-4 text-sm leading-8 text-slate-300 sm:text-base">{subtitle}</p>
            </div>

            <div className="w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-sky-900/40">
                  {user.role === 'admin' ? <Crown className="h-6 w-6" /> : user.role === 'manager' ? <UserCog className="h-6 w-6" /> : <UserRound className="h-6 w-6" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-extrabold text-white">{user.full_name}</div>
                  <div className="mt-1 text-xs text-slate-400">{user.phone}</div>
                </div>
              </div>
              <button
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white transition hover:bg-white/10"
                type="button"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                خروج از حساب
              </button>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-3 text-3xl font-black text-white">{value}</div>
        </div>
        <div className="rounded-2xl bg-sky-500/15 p-3 text-sky-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5 shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-white/5 p-3 text-sky-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-2 text-base font-extrabold text-white">{value}</div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const active = status === 'active'
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${active ? 'bg-emerald-500/15 text-emerald-100' : 'bg-rose-500/15 text-rose-100'}`}>
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      {active ? 'فعال' : 'غیرفعال'}
    </span>
  )
}

function RoleBadge({ role }) {
  const config = {
    resident: { label: 'ساکن', className: 'bg-slate-500/15 text-slate-100' },
    manager: { label: 'مدیر', className: 'bg-amber-500/15 text-amber-100' },
    admin: { label: 'ادمین', className: 'bg-fuchsia-500/15 text-fuchsia-100' },
  }
  const current = config[role]
  return <span className={`inline-flex rounded-full px-3 py-2 text-xs font-bold ${current.className}`}>{current.label}</span>
}

export default App
