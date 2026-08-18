import { LogOut, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useLogout } from '../../hooks/useLogout'
import { BrandMark } from '../../components/ui/BrandMark'
import { MiniInfoCard } from '../../components/ui/MiniInfoCard'
import { roleLabels, UserRole } from '../../utils/constants'

const dashboardTitles = {
  [UserRole.MANAGER]: 'پنل مدیر',
  [UserRole.RESIDENT]: 'پنل ساکن',
  [UserRole.SERVICE_STAFF]: 'پنل کارکنان خدمات',
}

export function RolePlaceholderPage({ authState, setAuthState }) {

  const handleLogout = useLogout(setAuthState)

  const roleTitle = dashboardTitles[authState.user.role] || 'پنل کاربری'
  const description =
    authState.user.role === UserRole.SERVICE_STAFF
      ? 'خوش آمدید؛ درخواست‌های خدماتی ارجاع‌شده به شما به‌زودی در این بخش نمایش داده می‌شوند.'
      : 'خوش آمدید؛ اطلاعات حساب و دسترسی‌های اصلی شما در این بخش نمایش داده می‌شود.'

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="panel-hero bg-slate-950 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <BrandMark dark />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15" type="button" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
          <div className="mt-10 max-w-2xl">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{roleTitle}</h1>
            <p className="mt-3 text-sm leading-8 text-slate-300">{description}</p>
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
