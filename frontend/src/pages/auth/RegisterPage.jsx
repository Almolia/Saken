import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { useForm } from '../../hooks/useForm'
import { authApi } from '../../lib/api'
import { validateRegister } from '../../lib/validators'
import { resolveHomePath } from '../../utils/helpers'
import { AuthPageShell } from '../../components/auth/AuthPageShell'
import { AuthCard } from '../../components/auth/AuthCard'
import { AuthSwitch } from '../../components/auth/AuthSwitch'
import { InputField } from '../../components/ui/InputField'
import { PasswordField } from '../../components/ui/PasswordField'
import { ServerError } from '../../components/ui/ServerError'
import { PrimaryButton } from '../../components/ui/PrimaryButton'

export function RegisterPage({ authState }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)

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
      <AuthCard title="ثبت‌نام" description="اطلاعات حساب خود را وارد کنید تا دسترسی شما به سامانه ایجاد شود." wide>
        <form className="space-y-5" onSubmit={form.handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <InputField label="نام و نام خانوادگی" name="full_name" type="text" value={form.values.full_name} onChange={form.handleChange} error={form.errors.full_name} placeholder="علی رضایی" />
            <InputField label="نام کاربری" optional name="username" type="text" value={form.values.username} onChange={form.handleChange} error={form.errors.username} placeholder="ali_rezaei" helper="اگر خالی بماند، شماره موبایل به عنوان نام کاربری ثبت می‌شود." />
            <InputField label="شماره موبایل" name="phone" type="tel" value={form.values.phone} onChange={form.handleChange} error={form.errors.phone} placeholder="09120000000" />
            <InputField label="کد ملی" name="national_id" type="text" value={form.values.national_id} onChange={form.handleChange} error={form.errors.national_id} placeholder="0012345678" />
            <PasswordField label="گذرواژه" name="password" value={form.values.password} onChange={form.handleChange} error={form.errors.password} placeholder="Abcd1234" showPassword={showPassword} onToggle={() => setShowPassword((current) => !current)} showStrength />
            <PasswordField label="تکرار گذرواژه" name="password_confirmation" value={form.values.password_confirmation} onChange={form.handleChange} error={form.errors.password_confirmation} placeholder="Abcd1234" showPassword={showPasswordConfirmation} onToggle={() => setShowPasswordConfirmation((current) => !current)} />
          </div>
          <ServerError error={form.serverError} />
          <PrimaryButton loading={form.loading}>ایجاد حساب کاربری</PrimaryButton>
        </form>
        <AuthSwitch text="قبلاً ثبت‌نام کرده‌اید؟" href="/login" label="وارد شوید" />
      </AuthCard>
    </AuthPageShell>
  )
}