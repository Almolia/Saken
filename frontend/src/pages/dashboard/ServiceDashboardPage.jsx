import { ClipboardList, LogOut, ShieldCheck, UserCog, UserRound, Users, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../components/ToastProvider'
import { useLogout } from '../../hooks/useLogout'
import { useForm } from '../../hooks/useForm'
import { authApi } from '../../lib/api'
import { validateAdminProfile } from '../../lib/validators'
import { roleLabels } from '../../utils/constants'
import { BrandMark } from '../../components/ui/BrandMark'
import { InputField } from '../../components/ui/InputField'
import { PasswordField } from '../../components/ui/PasswordField'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { ServerError } from '../../components/ui/ServerError'
import { MiniInfoCard } from '../../components/ui/MiniInfoCard'
import { MobileTab } from '../../components/ui/MobileTab'
import { SideNavItem } from '../../components/ui/SideNavItem'
import { AdminProfile } from './admin/AdminProfile'
import { StaffTasksSection } from './service/StaffTasksSection'

const sectionTitles = {
  tasks: 'وظایف من',
  account: 'حساب کاربری',
}

export function ServiceDashboardPage({ authState, setAuthState }) {
  const [activeSection, setActiveSection] = useState('tasks')

  const handleLogout = useLogout(setAuthState)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-hidden border-l border-white/10 bg-slate-950 p-5 text-white xl:flex">
          <div className="rounded-[1.5rem] bg-white/5 p-4 ring-1 ring-white/10">
            <BrandMark dark compact />
          </div>

          <nav aria-label="منوی مدیریت" className="mt-7 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-4 pr-1 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
            <SideNavItem icon={ClipboardList} label="وظایف من" active={activeSection === 'tasks'} onClick={() => setActiveSection('tasks')} />
            <SideNavItem icon={UserRound} label="حساب کاربری" active={activeSection === 'account'} onClick={() => setActiveSection('account')} />
          </nav>

          <AdminProfile user={authState.user} onLogout={handleLogout} />
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-teal-700">
                  <Wrench className="h-4 w-4" />
                  پنل کارکنان خدمات
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{sectionTitles[activeSection]}</h1>
              </div>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 xl:hidden" type="button" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </div>

            <div className="mt-4 flex gap-2 xl:hidden">
              <MobileTab active={activeSection === 'tasks'} onClick={() => setActiveSection('tasks')} label="وظایف من" />
              <MobileTab active={activeSection === 'account'} onClick={() => setActiveSection('account')} label="حساب کاربری" />
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
            {activeSection === 'tasks' ? <StaffTasksSection user={authState.user} /> : <AccountSection user={authState.user} setAuthState={setAuthState} />}
          </div>
        </main>
      </div>
    </div>
  )
}

function AccountSection({ user, setAuthState }) {
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
      const response = await authApi.updateServiceStaffProfile(values)
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
          <h2 className="text-xl font-black text-slate-950">ویرایش اطلاعات حساب</h2>
          <p className="mt-1 text-sm leading-7 text-slate-500">اطلاعات حساب خود را ویرایش کنید. برای تغییر رمز، رمز فعلی و رمز جدید را وارد کنید؛ در غیر این صورت فیلدهای رمز را خالی بگذارید.</p>
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
              <PasswordField label="رمز جدید" name="new_password" value={profileForm.values.new_password} onChange={profileForm.handleChange} error={profileForm.errors.new_password} showPassword={showNewPassword} onToggle={() => setShowNewPassword((current) => !current)} showStrength />
              <PasswordField label="تکرار رمز جدید" name="new_password_confirmation" value={profileForm.values.new_password_confirmation} onChange={profileForm.handleChange} error={profileForm.errors.new_password_confirmation} showPassword={showNewPasswordConfirmation} onToggle={() => setShowNewPasswordConfirmation((current) => !current)} />
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
