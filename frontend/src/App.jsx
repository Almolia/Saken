import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import { ToastProvider, useToast } from './components/ToastProvider'
import { useForm } from './hooks/useForm'
import { authApi, managerApi } from './lib/api'
import { validateLogin, validateManagerBootstrap, validateRegister } from './lib/validators'

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
    return (
      <div className="app-backdrop centered-shell">
        <div className="loading-card">در حال آماده‌سازی برنامه...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={resolveHomePath(authState.user)} replace />} />
      <Route path="/login" element={<LoginPage authState={authState} setAuthState={setAuthState} />} />
      <Route path="/register" element={<RegisterPage authState={authState} />} />
      <Route path="/setup-manager" element={<ManagerBootstrapPage />} />
      <Route
        path="/resident/dashboard"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={['resident']}>
            <ResidentDashboardPage authState={authState} setAuthState={setAuthState} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/users"
        element={
          <ProtectedRoute user={authState.user} allowedRoles={['manager', 'admin']}>
            <ManagerUsersPage authState={authState} setAuthState={setAuthState} />
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
  return '/manager/users'
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

function AuthLayout({ title, subtitle, caption, children }) {
  return (
    <div className="app-backdrop auth-page-shell">
      <div className="auth-page-grid">
        <section className="auth-hero-panel">
          <div className="brand-chip">سامانه ساکن</div>
          <div className="hero-content">
            <span className="hero-caption">{caption}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="hero-orbs">
            <span className="orb orb-one"></span>
            <span className="orb orb-two"></span>
            <span className="orb orb-three"></span>
          </div>
        </section>

        <section className="auth-form-panel">{children}</section>
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

  if (authState.user) {
    return <Navigate to={resolveHomePath(authState.user)} replace />
  }

  return (
    <AuthLayout
      caption="ورود امن"
      title="ورود به حساب کاربری"
      subtitle="برای دسترسی به سامانه، شماره موبایل و گذرواژه 6 رقمی خود را وارد کنید."
    >
      <form className="auth-form modern-form" onSubmit={form.handleSubmit}>
        <div className="form-header compact-header">
          <h2>خوش برگشتید</h2>
        </div>

        <div className="form-grid single-column">
          <InputField label="شماره موبایل" name="phone" type="tel" value={form.values.phone} onChange={form.handleChange} error={form.errors.phone} placeholder="09120000000" />
          <InputField label="گذرواژه 6 رقمی" name="password" type="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} placeholder="123456" />
        </div>

        {form.serverError ? <div className="form-alert error">{form.serverError}</div> : null}

        <button className="primary-button gradient-button" type="submit" disabled={form.loading}>
          {form.loading ? 'در حال ورود...' : 'ورود به سامانه'}
        </button>

        <div className="auth-footer-links">
          <a href="/setup-manager">ایجاد مدیر اولیه</a>
          <a href="/register">ایجاد حساب جدید</a>
        </div>
      </form>
    </AuthLayout>
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
    <AuthLayout
      caption="ثبت‌نام"
      title="ایجاد حساب کاربری"
      subtitle="فقط اطلاعات اصلی را وارد کنید تا حساب شما سریع ساخته شود."
    >
      <form className="auth-form modern-form" onSubmit={form.handleSubmit}>
        <div className="form-header compact-header">
          <h2>ایجاد حساب</h2>
        </div>

        <div className="form-grid">
          <InputField label="نام و نام خانوادگی" name="full_name" type="text" value={form.values.full_name} onChange={form.handleChange} error={form.errors.full_name} placeholder="مثلاً علی رضایی" />
          <InputField label="شماره موبایل" name="phone" type="tel" value={form.values.phone} onChange={form.handleChange} error={form.errors.phone} placeholder="09120000000" />
          <InputField label="کد ملی" name="national_id" type="text" value={form.values.national_id} onChange={form.handleChange} error={form.errors.national_id} placeholder="1234567890" />
          <InputField label="گذرواژه 6 رقمی" name="password" type="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} placeholder="123456" />
          <InputField label="تکرار گذرواژه" name="password_confirmation" type="password" value={form.values.password_confirmation} onChange={form.handleChange} error={form.errors.password_confirmation} placeholder="123456" />
        </div>

        {form.serverError ? <div className="form-alert error">{form.serverError}</div> : null}

        <button className="primary-button gradient-button" type="submit" disabled={form.loading}>
          {form.loading ? 'در حال ثبت‌نام...' : 'ایجاد حساب کاربری'}
        </button>

        <div className="auth-footer-links single-link-row">
          <a href="/login">ورود به حساب موجود</a>
        </div>
      </form>
    </AuthLayout>
  )
}

function ManagerBootstrapPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const form = useForm({
    initialValues: {
      full_name: '',
      phone: '',
      national_id: '',
      password: '',
    },
    validate: validateManagerBootstrap,
    onSubmit: async (values) => {
      await managerApi.bootstrap(values)
      showToast('مدیر اولیه با موفقیت ایجاد شد.')
      navigate('/login', { replace: true })
    },
  })

  return (
    <AuthLayout
      caption="راه‌اندازی اولیه"
      title="ایجاد مدیر اولیه سامانه"
      subtitle="برای شروع کار، حساب مدیر اولیه را با اطلاعات پایه ایجاد کنید."
    >
      <form className="auth-form modern-form" onSubmit={form.handleSubmit}>
        <div className="form-header compact-header">
          <h2>راه‌اندازی مدیر</h2>
        </div>

        <div className="form-grid">
          <InputField label="نام و نام خانوادگی" name="full_name" type="text" value={form.values.full_name} onChange={form.handleChange} error={form.errors.full_name} placeholder="مثلاً مدیر ساختمان" />
          <InputField label="شماره موبایل" name="phone" type="tel" value={form.values.phone} onChange={form.handleChange} error={form.errors.phone} placeholder="09120000000" />
          <InputField label="کد ملی" name="national_id" type="text" value={form.values.national_id} onChange={form.handleChange} error={form.errors.national_id} placeholder="1234567890" />
          <InputField label="گذرواژه 6 رقمی" name="password" type="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} placeholder="123456" />
        </div>

        {form.serverError ? <div className="form-alert error">{form.serverError}</div> : null}

        <button className="primary-button gradient-button" type="submit" disabled={form.loading}>
          {form.loading ? 'در حال ایجاد...' : 'ایجاد مدیر اولیه'}
        </button>
      </form>
    </AuthLayout>
  )
}

function ResidentDashboardPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  async function handleLogout() {
    await authApi.logout()
    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-backdrop dashboard-shell">
      <section className="dashboard-header resident-header">
        <div>
          <span className="dashboard-badge">پنل ساکن</span>
          <h1>سلام {authState.user.full_name}</h1>
          <p>حساب شما با موفقیت فعال است و آماده توسعه قابلیت‌های بعدی سامانه خواهد بود.</p>
        </div>
        <button className="secondary-button light-button" type="button" onClick={handleLogout}>
          خروج از حساب
        </button>
      </section>

      <section className="resident-grid">
        <div className="dashboard-panel hero-panel">
          <h2>اطلاعات حساب شما</h2>
          <div className="resident-info-grid">
            <InfoCard label="نام" value={authState.user.full_name} />
            <InfoCard label="شماره موبایل" value={authState.user.phone} />
            <InfoCard label="کد ملی" value={authState.user.national_id} />
            <InfoCard label="نقش" value="ساکن" />
          </div>
        </div>
        <div className="dashboard-panel notice-panel">
          <h2>وضعیت فعلی</h2>
          <p>ثبت‌نام، ورود، مدیریت دسترسی و داشبورد اولیه ساکن تا این مرحله آماده است.</p>
          <div className="status-highlight">آماده برای توسعه امکانات رزرو، پرداخت، اعلان و خدمات تعاملی</div>
        </div>
      </section>
    </div>
  )
}

function InputField({ label, name, type, value, onChange, error, placeholder }) {
  return (
    <label className="field modern-field">
      <span>{label}</span>
      <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  )
}

function ManagerUsersPage({ authState, setAuthState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [data, setData] = useState({ users: [], stats: null, loading: true, error: '' })

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

  async function handleLogout() {
    await authApi.logout()
    setAuthState({ loading: false, user: null })
    showToast('از حساب خارج شدید.')
    navigate('/login', { replace: true })
  }

  async function toggleStatus(user) {
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
  }

  return (
    <div className="app-backdrop dashboard-shell">
      <section className="dashboard-header glass-header">
        <div>
          <span className="dashboard-badge">مدیریت کاربران</span>
          <h1>فهرست کاربران سامانه</h1>
          <p>در این بخش می‌توانید وضعیت دسترسی کاربران را مدیریت کنید.</p>
        </div>
        <div className="manager-card elevated-card">
          <span>کاربر جاری</span>
          <strong>{authState.user.full_name}</strong>
          <small>{authState.user.role === 'manager' ? 'مدیر ساختمان' : 'ادمین سیستم'}</small>
          <button className="secondary-button light-button" type="button" onClick={handleLogout}>
            خروج از حساب
          </button>
        </div>
      </section>

      <section className="dashboard-grid refined-grid">
        <div className="dashboard-panel soft-panel">
          <div className="panel-header">
            <h2>کاربران ثبت‌شده</h2>
            {data.stats ? <span className="pill refined-pill">{data.stats.total} کاربر</span> : null}
          </div>

          {data.loading ? <div className="empty-state">در حال دریافت اطلاعات کاربران...</div> : null}
          {data.error ? <div className="form-alert error">{data.error}</div> : null}

          {data.stats ? (
            <div className="stats-row">
              <StatCard label="کل کاربران" value={data.stats.total} />
              <StatCard label="کاربران فعال" value={data.stats.active} />
              <StatCard label="کاربران غیرفعال" value={data.stats.disabled} />
            </div>
          ) : null}

          {!data.loading && !data.error ? (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>نام</th>
                    <th>شماره موبایل</th>
                    <th>کد ملی</th>
                    <th>نقش</th>
                    <th>وضعیت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name}</td>
                      <td>{user.phone}</td>
                      <td>{user.national_id}</td>
                      <td>{user.role === 'resident' ? 'ساکن' : user.role === 'manager' ? 'مدیر' : 'ادمین'}</td>
                      <td>
                        <span className={`status-badge ${user.status}`}>{user.status === 'active' ? 'فعال' : 'غیرفعال'}</span>
                      </td>
                      <td>
                        <button className="secondary-button" type="button" onClick={() => toggleStatus(user)} disabled={authState.user.id === user.id}>
                          {user.status === 'active' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card refined-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function InfoCard({ label, value }) {
  return (
    <div className="info-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
