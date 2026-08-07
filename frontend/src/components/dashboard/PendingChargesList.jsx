import { CircleAlert, Receipt, RotateCcw, SmilePlus } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/helpers'

function ChargeCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
      <div className="h-5 w-40 rounded-full bg-slate-200" />
      <div className="mt-4 h-3 w-full rounded-full bg-slate-200" />
      <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-200" />
      <div className="mt-5 flex items-center justify-between">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-6 w-24 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}

function EmptyCharges() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-emerald-300 bg-emerald-50/60 px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
        <SmilePlus className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-900">شارژ پرداخت‌نشده‌ای ندارید!</h3>
      <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
        همه‌چیز به‌روز است؛ در صورت صدور شارژ جدید، در همین بخش نمایش داده می‌شود.
      </p>
    </div>
  )
}

export function PendingChargesList({ charges, loading, error, onRetry }) {
  return (
    <section
      aria-label="شارژهای پرداخت‌نشده"
      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">شارژهای پرداخت‌نشده</h2>
          <p className="mt-1 text-sm text-slate-500">صورت‌حساب‌های در انتظار پرداخت شما</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="در حال بارگذاری شارژها">
          <ChargeCardSkeleton />
          <ChargeCardSkeleton />
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
              <div className="text-sm font-bold text-rose-800">دریافت شارژها ناموفق بود</div>
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
        <EmptyCharges />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {charges.map((charge) => (
            <article
              key={charge.id}
              className="flex flex-col rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-slate-200/70"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-black text-slate-950">{charge.title}</h3>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                  در انتظار پرداخت
                </span>
              </div>

              {charge.description ? (
                <p className="mt-3 flex-1 text-sm font-medium leading-7 text-slate-600">
                  {charge.description}
                </p>
              ) : (
                <div className="mt-3 flex-1" />
              )}

              <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                <div>
                  <div className="text-xs font-bold text-slate-500">مهلت پرداخت</div>
                  <div className="mt-1 text-sm font-bold text-slate-700">{formatDate(charge.due_date)}</div>
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-500">مبلغ</div>
                  <div className="mt-1 text-lg font-black text-teal-700">
                    {formatCurrency(charge.amount)}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
