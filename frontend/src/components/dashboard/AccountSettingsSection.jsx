import { useState } from 'react'
import { ShieldCheck, UserCog, UserRound, Users } from 'lucide-react'
import { useToast } from '../ToastProvider'
import { useForm } from '../../hooks/useForm'
import { validateAdminProfile } from '../../lib/validators'
import { roleLabels } from '../../utils/constants'
import { InputField } from '../ui/InputField'
import { PasswordField } from '../ui/PasswordField'
import { PrimaryButton } from '../ui/PrimaryButton'
import { ServerError } from '../ui/ServerError'
import { MiniInfoCard } from '../ui/MiniInfoCard'

export function AccountSettingsSection({ user, setAuthState, updateProfile, title = 'ویرایش اطلاعات حساب' }) {
  const { showToast } = useToast()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showNewPasswordConfirmation, setShowNewPasswordConfirmation] = useState(false)

  const profileForm = useForm({
    initialValues: {
      full_name: user.full_name || '',
      username: user.username || '',
      phone: user.phone || '',
      national_id: user.national_id || '',
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
    validate: validateAdminProfile,
    onSubmit: async (values) => {
      const response = await updateProfile(values)
      setAuthState({ loading: false, user: response.user })
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

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-7 text-slate-500">
            اطلاعات حساب خود را ویرایش کنید. برای تغییر رمز، رمز فعلی و رمز جدید را وارد کنید؛ در غیر این صورت فیلدهای رمز را خالی بگذارید.
          </p>
        </div>

        <form className="space-y-6 p-6" onSubmit={profileForm.handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <InputField label="نام و نام خانوادگی" name="full_name" type="text" value={profileForm.values.full_name} onChange={profileForm.handleChange} error={profileForm.errors.full_name} placeholder="علی رضایی" />
            <InputField label="نام کاربری" name="username" type="text" value={profileForm.values.username} onChange={profileForm.handleChange} error={profileForm.errors.username} placeholder="username" />
            <InputField label="شماره موبایل" name="phone" type="tel" value={profileForm.values.phone} onChange={profileForm.handleChange} error={profileForm.errors.phone} placeholder="09123456789" />
            <InputField label="کد ملی" name="national_id" type="text" value={profileForm.values.national_id} onChange={profileForm.handleChange} error={profileForm.errors.national_id} placeholder="0012345678" />
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="mb-5">
              <h3 className="text-base font-black text-slate-950">تغییر رمز عبور</h3>
              <p className="mt-1 text-sm leading-7 text-slate-500">اگر نمی‌خواهید رمز را تغییر دهید، این بخش را خالی بگذارید.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <PasswordField label="رمز فعلی" name="current_password" value={profileForm.values.current_password} onChange={profileForm.handleChange} error={profileForm.errors.current_password} placeholder="رمز فعلی" showPassword={showCurrentPassword} onToggle={() => setShowCurrentPassword((current) => !current)} />
              <PasswordField label="رمز جدید" name="new_password" value={profileForm.values.new_password} onChange={profileForm.handleChange} error={profileForm.errors.new_password} placeholder="Abcd1234" showPassword={showNewPassword} onToggle={() => setShowNewPassword((current) => !current)} showStrength />
              <PasswordField label="تکرار رمز جدید" name="new_password_confirmation" value={profileForm.values.new_password_confirmation} onChange={profileForm.handleChange} error={profileForm.errors.new_password_confirmation} placeholder="Abcd1234" showPassword={showNewPasswordConfirmation} onToggle={() => setShowNewPasswordConfirmation((current) => !current)} />
            </div>
          </div>

          <ServerError error={profileForm.serverError} />
          <PrimaryButton loading={profileForm.loading}>ذخیره تغییرات</PrimaryButton>
        </form>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          <h2 className="text-xl font-black text-slate-950">نمای کلی حساب</h2>
          <div className="mt-6 grid gap-4">
            <MiniInfoCard label="نام" value={user.full_name} icon={UserRound} />
            <MiniInfoCard label="نام کاربری" value={user.username || '—'} icon={UserCog} />
            <MiniInfoCard label="شماره موبایل" value={user.phone} icon={Users} />
            <MiniInfoCard label="نقش" value={roleLabels[user.role]} icon={ShieldCheck} />
          </div>
        </div>
      </div>
    </section>
  )
}
