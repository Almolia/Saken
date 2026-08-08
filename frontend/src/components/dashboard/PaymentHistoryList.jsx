import { CircleAlert, History, RotateCcw } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/helpers'

function HistoryRowSkeleton() {
  return (
    <div className="flex animate-pulse items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="space-y-2">
        <div className="h-4 w-36 rounded-full bg-slate-200" />
        <div className="h-3 w-24 rounded-full bg-slate-200" />
      </div>
      <div className="h-5 w-24 rounded-full bg-slate-200" />
    </div>
  )
}

/**
 * Record of everything the resident has already settled. Without it a paid
 * charge simply disappears from the dashboard, leaving no trace that the
 * payment happened.
 */
export function PaymentHistoryList({ charges, totalPaid, loading, error, onRetry }) {
  return (
    <section
      aria-label="تاریخچه پرداخت"
      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">تاریخچه پرداخت</h2>
            <p className="mt-1 text-sm text-slate-500">صورت‌حساب‌هایی که تسویه کرده‌اید</p>
          </div>
        </div>

        {!loading && !error && charges.length > 0 ? (
          <div className="shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-left">
            <div className="text-xs font-bold text-slate-500">مجموع پرداختی</div>
            <div className="mt-0.5 text-base font-black text-emerald-700">
              {formatCurrency(totalPaid)}
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="در حال بارگذاری تاریخچه پرداخت">
          <HistoryRowSkeleton />
          <HistoryRowSkeleton />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-white p-1.5 text-rose-600">
              <CircleAlert className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-800">دریافت تاریخچه پرداخت ناموفق بود</div>
              <p className="mt-1 text-sm font-medium leading-7 text-rose-700">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-100"
          >
            <RotateCcw className="h-4 w-4" />
            تلاش مجدد
          </button>
        </div>
      ) : charges.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
          <p className="text-sm font-medium leading-7 text-slate-600">
            هنوز پرداختی ثبت نشده است؛ پس از تسویه اولین صورت‌حساب، در همین بخش نمایش داده می‌شود.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {charges.map((charge) => (
            <li
              key={charge.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-black text-slate-900">{charge.title}</h3>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    پرداخت‌شده
                  </span>
                </div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                  {/* Charges settled before the backend recorded payment times
                      carry no date; say so rather than showing a blank. */}
                  {charge.paid_at
                    ? `تاریخ پرداخت: ${formatDate(charge.paid_at)}`
                    : 'تاریخ پرداخت ثبت نشده است'}
                </div>
              </div>
              <div className="shrink-0 text-base font-black text-slate-800 sm:text-left">
                {formatCurrency(charge.amount)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
