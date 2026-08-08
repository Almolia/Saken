import { CircleAlert, Receipt, RotateCcw, SmilePlus } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { ChargeSelectionBar } from './ChargeSelectionBar'

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

// The due date is inclusive, so a bill only counts as overdue once its due day
// has fully passed in the resident's own timezone.
function isOverdue(dueDate) {
  if (!dueDate) return false
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return false

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return due < startOfToday
}

export function PendingChargesList({
  charges,
  loading,
  error,
  onRetry,
  selectedIds = [],
  allSelected = false,
  onToggle = () => {},
  onToggleAll = () => {},
  onPay = () => {},
  totalSelected = 0,
  unitDebt,
  paying = false,
}) {
  const showSelection = !loading && !error && charges.length > 0

  return (
    <section
      aria-label="شارژهای پرداخت‌نشده"
      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">شارژهای پرداخت‌نشده</h2>
            <p className="mt-1 text-sm text-slate-500">صورت‌حساب‌های در انتظار پرداخت شما</p>
          </div>
        </div>

        {showSelection ? (
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 sm:self-center">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              disabled={paying}
              className="h-4 w-4 accent-teal-600"
            />
            انتخاب همه
          </label>
        ) : null}
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
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {charges.map((charge) => {
              const selected = selectedIds.includes(charge.id)
              const overdue = isOverdue(charge.due_date)

              return (
                // The whole card is the label, so a tap anywhere on the bill
                // toggles it rather than only the small checkbox.
                <label
                  key={charge.id}
                  className={`flex cursor-pointer flex-col rounded-[1.5rem] border p-5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70 ${
                    selected
                      ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-100'
                      : 'border-slate-200 bg-slate-50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggle(charge.id)}
                        disabled={paying}
                        aria-label={`انتخاب ${charge.title}`}
                        className="mt-1 h-4 w-4 shrink-0 accent-teal-600"
                      />
                      <h3 className="text-base font-black text-slate-950">{charge.title}</h3>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        overdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {overdue ? 'مهلت گذشته' : 'در انتظار پرداخت'}
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
                      <div
                        className={`mt-1 text-sm font-bold ${
                          overdue ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {formatDate(charge.due_date)}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-500">مبلغ</div>
                      <div className="mt-1 text-lg font-black text-teal-700">
                        {formatCurrency(charge.amount)}
                      </div>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          <ChargeSelectionBar
            selectedCount={selectedIds.length}
            totalAmount={totalSelected}
            unitDebt={unitDebt}
            onPay={onPay}
            paying={paying}
          />
        </>
      )}
    </section>
  )
}
