import { LogOut, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ToastProvider'
import { authApi } from '../../lib/api'
import { roleLabels } from '../../utils/constants'
import { BrandMark } from '../../components/ui/BrandMark'
import { MiniInfoCard } from '../../components/ui/MiniInfoCard'

export function RolePlaceholderPage({ authState, setAuthState }) {
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