import { CircleCheck, CircleAlert, Wallet } from 'lucide-react'
import { formatCurrency } from '../../utils/helpers'

function DebtSkeleton() {
  return (
    <div className="flex items-center gap-4 animate-pulse">
      <div className="h-12 w-12 rounded-2xl bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="h-6 w-40 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}

/**
 * Highly visible financial summary shown at the top of the Resident Dashboard.
 * - Green state when the unit has no outstanding debt.
 * - Red/orange state when there is an outstanding balance.
 */
export function DebtSummaryCard({ unit, loading }) {
  if (loading) {
    return (
      <section
        aria-label="خلاصه بدهی"
        className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8"
      >
        <DebtSkeleton />
      </section>
    )
  }

  const hasUnit = Boolean(unit)
  const rawDebt = hasUnit ? unit.unit_debt : 0
  const debt = Number.parseFloat(rawDebt)
  const isClear = !hasUnit || !Number.isFinite(debt) || debt <= 0

  const tone = isClear
    ? {
        container: 'border-emerald-200 bg-emerald-50',
        iconBox: 'bg-emerald-600 text-white',
        badge: 'bg-emerald-100 text-emerald-700',
        badgeText: 'مبلغی پرداخت‌نشده ندارید',
      }
    : {
        container: 'border-amber-200 bg-amber-50',
        iconBox: 'bg-amber-500 text-white',
        badge: 'bg-amber-100 text-amber-700',
        badgeText: 'بدهی پرداخت‌نشده دارید',
      }

  return (
    <section
      aria-label="خلاصه بدهی"
      className={`flex flex-col gap-5 rounded-[2rem] border p-6 shadow-xl shadow-slate-200/70 sm:flex-row sm:items-center sm:justify-between sm:p-8 ${tone.container}`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.iconBox}`}>
          {isClear ? <CircleCheck className="h-6 w-6" /> : <CircleAlert className="h-6 w-6" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-600">مجموع بدهی واحد شما</h2>
          </div>
          <p
            className={`mt-2 text-3xl font-black tracking-tight sm:text-4xl ${
              isClear ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {hasUnit ? formatCurrency(debt) : formatCurrency(0)}
          </p>
        </div>
      </div>

      <span
        className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-bold sm:self-center ${tone.badge}`}
      >
        {tone.badgeText}
      </span>
    </section>
  )
}
