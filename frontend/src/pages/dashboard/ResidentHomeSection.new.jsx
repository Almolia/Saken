import {
  ArrowUpLeft,
  BellRing,
  Building2,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  Home,
  Receipt,
  UserRound,
  Wallet,
} from 'lucide-react'
import { AnnouncementFeed } from '../../components/dashboard/AnnouncementFeed'
import { DebtSummaryCard } from '../../components/dashboard/DebtSummaryCard'
import { UnitInfoCard } from '../../components/dashboard/UnitInfoCard'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { ReservationCategory, groupReservations } from '../../utils/reservations'
import { isCompleted } from '../../utils/serviceRequests'

function StatCard({ label, value, hint, icon: Icon, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    teal: 'bg-teal-50 text-teal-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-2 break-words text-xl font-black tracking-tight text-slate-950">{value}</div>
      {hint ? <div className="mt-1 text-xs font-medium text-slate-400">{hint}</div> : null}
    </div>
  )
}

function QuickAction({ label, description, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/70"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-teal-300 transition group-hover:bg-teal-600 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-black text-slate-950">{label}</span>
          <ArrowUpLeft className="h-4 w-4 text-slate-300 transition group-hover:text-teal-600" />
        </div>
        <p className="mt-1 text-xs leading-6 text-slate-500">{description}</p>
      </div>
    </button>
  )
}

export function ResidentHomeSectionNew({ user, dashboard, onNavigate }) {
  const debt = Number.parseFloat(dashboard.unit?.unit_debt)
  const hasDebt = Number.isFinite(debt) && debt > 0
  const upcomingCount = groupReservations(dashboard.reservations)[ReservationCategory.UPCOMING].length
  const openRequests = dashboard.requests.filter((request) => !isCompleted(request)).length
  const todayLabel = formatDate(new Date().toISOString())

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="panel-hero p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
                <Home className="h-3.5 w-3.5" />
                {todayLabel || 'امروز'}
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                خوش آمدید، {user.full_name}
              </h2>
              <p className="mt-3 text-sm leading-8 text-slate-600">
                وضعیت واحد، بدهی، رزروها و درخواست‌های خدمات شما در این صفحه خلاصه شده است. از میانبرها برای رفتن مستقیم به هر بخش استفاده کنید.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/70 bg-white/80 px-5 py-4 shadow-sm">
              <div className="text-xs font-bold text-slate-500">واحد شما</div>
              <div className="mt-1 text-2xl font-black text-slate-950">
                {dashboard.loading ? '...' : dashboard.unit?.unit_number || 'ثبت نشده'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="بدهی واحد"
          value={dashboard.loading ? '...' : formatCurrency(Number.isFinite(debt) ? debt : 0)}
          hint={hasDebt ? 'پرداخت‌نشده' : 'تسویه‌شده'}
          icon={Wallet}
          tone={hasDebt ? 'rose' : 'emerald'}
        />
        <StatCard
          label="شارژهای باز"
          value={dashboard.chargesLoading ? '...' : dashboard.pendingCharges.length}
          hint="صورت‌حساب در انتظار پرداخت"
          icon={Receipt}
          tone={dashboard.pendingCharges.length ? 'amber' : 'teal'}
        />
        <StatCard
          label="رزروهای پیش‌رو"
          value={dashboard.reservationsLoading ? '...' : upcomingCount}
          hint="رزرو فعال یا آینده"
          icon={CalendarCheck}
          tone="teal"
        />
        <StatCard
          label="درخواست‌های باز"
          value={dashboard.requestsLoading ? '...' : openRequests}
          hint="هنوز تکمیل نشده"
          icon={ClipboardList}
          tone="slate"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          label="پرداخت شارژ"
          description="صورت‌حساب‌های باز را ببینید و تسویه کنید"
          icon={CreditCard}
          onClick={() => onNavigate('charges')}
        />
        <QuickAction
          label="رزرو امکانات"
          description="باشگاه، سالن و سایر فضاهای مشترک"
          icon={Building2}
          onClick={() => onNavigate('amenities')}
        />
        <QuickAction
          label="ثبت درخواست خدمات"
          description="تعمیرات واحد یا مشاعات را پیگیری کنید"
          icon={ClipboardList}
          onClick={() => onNavigate('services')}
        />
        <QuickAction
          label="ویرایش حساب"
          description="اطلاعات شخصی و رمز عبور"
          icon={UserRound}
          onClick={() => onNavigate('account')}
        />
      </div>

      <DebtSummaryCard unit={dashboard.unit} loading={dashboard.loading} />

      <UnitInfoCard
        unit={dashboard.unit}
        loading={dashboard.loading}
        error={dashboard.error}
        onRetry={dashboard.retry}
      />

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
          <BellRing className="h-4 w-4 text-teal-600" />
          آخرین اطلاعیه‌های ساختمان
        </div>
        <AnnouncementFeed />
      </div>
    </div>
  )
}
