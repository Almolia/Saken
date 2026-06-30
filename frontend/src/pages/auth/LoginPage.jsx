import { Navigate, useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { useForm } from '../../hooks/useForm'
import { authApi } from '../../lib/api'
import { validateLogin } from '../../lib/validators'
import { resolveHomePath } from '../../utils/helpers'
import { AuthPageShell } from '../../components/auth/AuthPageShell'
import { AuthCard } from '../../components/auth/AuthCard'
import { AuthSwitch } from '../../components/auth/AuthSwitch'
import { InputField } from '../../components/ui/InputField'
import { ServerError } from '../../components/ui/ServerError'
import { PrimaryButton } from '../../components/ui/PrimaryButton'

export function LoginPage({ authState, setAuthState }) {
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