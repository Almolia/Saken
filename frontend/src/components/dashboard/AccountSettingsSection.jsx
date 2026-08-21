import { KeyRound, ShieldCheck, UserCog, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { useForm } from '../../hooks/useForm'
import { authApi } from '../../lib/api'
import { validateAdminProfile } from '../../lib/validators'
import { roleLabels } from '../../utils/constants'
import { InputField } from '../ui/InputField'
import { MiniInfoCard } from '../ui/MiniInfoCard'
import { PasswordField } from '../ui/PasswordField'
import { PrimaryButton } from '../ui/PrimaryButton'
import { ServerError } from '../ui/ServerError'

function profileValuesFromUser(user) {
  return {
    full_name: user?.full_name || '',
    username: user?.username || '',
    phone: user?.phone || '',
    national_id: user?.national_id || '',
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  }
}

export function AccountSettingsSection({
  user,
  setAuthState,
  updateProfile = authApi.updateProfile,
  heading = 'ویرایش اطلاعات حساب',
  description = 'اطلاعات حساب خود را ویرایش کنید. برای تغییر رمز، رمز فعلی و رمز جدید را وارد کنید؛ در غیر این صورت فیلدهای رمز را خالی بگذارید.',
  showOverview = true,
}) {
  const { showToast } = useToast()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showNewPasswordConfirmation, setShowNewPasswordConfirmation] = useState(false)

  const profileForm = useForm({
    initialValues: profileValuesFromUser(user),
    validate: validateAdminProfile,
    onSubmit: async (values) => {
      const response = await updateProfile(values)
      setAuthState({ loading: false, user: response.user })
      profileForm.setValues(profileValuesFromUser(response.user))
      showToast(response.message || 'اطلاعات حساب با موفقیت ذخیره شد.')
    },
  })

  return (
    <section className={showOverview ? 'grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]' : undefined}>
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">{heading}</h2>
              <p className="mt-1 text-sm leading-7 text-slate-500">{description}</p>
            </div>
          </div>
        </div>

        <form className="space-y-6 p-6" onSubmit={profileForm.handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <InputField
              label="نام و نام خانوادگی"
              name="full_name"
              type="text"
              value={profileForm.values.full_name}
              onChange={profileForm.handleChange}
              error={profileForm.errors.full_name}
              placeholder="علی رضایی"
            />
            <InputField
              label="نام کاربری"
              name="username"
              type="text"
              value={profileForm.values.username}
              onChange={profileForm.handleChange}
              error={profileForm.errors.username}
              placeholder="username"
            />
            <InputField
              label="شماره موبایل"
              name="phone"
              type="tel"
              value={profileForm.values.phone}
              onChange={profileForm.handleChange}
              error={profileForm.errors.phone}
              placeholder="09123456789"
            />
            <InputField
              label="کد ملی"
              name="national_id"
              type="text"
              value={profileForm.values.national_id}
              onChange={profileForm.handleChange}
              error={profileForm.errors.national_id}
              placeholder="0012345678"
            />
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">تغییر رمز عبور</h3>
                <p className="mt-1 text-sm leading-7 text-slate-500">
                  اگر نمی‌خواهید رمز را تغییر دهید، این بخش را خالی بگذارید.
                </p>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <PasswordField
                label="رمز فعلی"
                name="current_password"
                value={profileForm.values.current_password}
                onChange={profileForm.handleChange}
                error={profileForm.errors.current_password}
                placeholder="رمز فعلی"
                showPassword={showCurrentPassword}
                onToggle={() => setShowCurrentPassword((current) => !current)}
              />
              <PasswordField
                label="رمز جدید"
                name="new_password"
                value={profileForm.values.new_password}
                onChange={profileForm.handleChange}
                error={profileForm.errors.new_password}
               
                showPassword={showNewPassword}
                onToggle={() => setShowNewPassword((current) => !current)}
                showStrength
              />
              <PasswordField
                label="تکرار رمز جدید"
                name="new_password_confirmation"
                value={profileForm.values.new_password_confirmation}
                onChange={profileForm.handleChange}
                error={profileForm.errors.new_password_confirmation}
               
                showPassword={showNewPasswordConfirmation}
                onToggle={() => setShowNewPasswordConfirmation((current) => !current)}
              />
            </div>
          </div>

          <ServerError error={profileForm.serverError} />
          <PrimaryButton loading={profileForm.loading}>ذخیره تغییرات</PrimaryButton>
        </form>
      </div>

      {showOverview ? (
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
      ) : null}
    </section>
  )
}
