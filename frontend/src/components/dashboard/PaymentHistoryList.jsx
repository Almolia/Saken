import {
  ArrowDownUp,
  CircleAlert,
  Download,
  History,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { PaymentReceiptModal } from './PaymentReceiptModal'
import { downloadTextFile } from '../../utils/download'
import { formatCurrency, formatDate } from '../../utils/helpers'
import {
  PaymentSort,
  paymentSortOptions,
  searchPayments,
  sortPayments,
  summarizePayments,
  toPaymentHistoryCsv,
} from '../../utils/payments'

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

function SummaryTile({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 break-words text-base font-black">{value}</div>
    </div>
  )
}

/**
 * Record of everything the resident has already settled. Without it a paid
 * charge simply disappears from the dashboard, leaving no trace that the
 * payment happened.
 *
 * The list only ever grows, so it carries its own search and ordering; both
 * are view state rather than a refetch, because the whole history is already
 * in hand and a round trip would only add latency.
 */
export function PaymentHistoryList({ charges, totalPaid, loading, refreshing = false, error, onRetry }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(PaymentSort.NEWEST)
  // The settled charge whose receipt is open; null means no receipt on screen.
  const [receiptCharge, setReceiptCharge] = useState(null)
  const [exportError, setExportError] = useState('')

  const visibleCharges = useMemo(
    () => sortPayments(searchPayments(charges, search), sort),
    [charges, search, sort],
  )
  const summary = useMemo(() => summarizePayments(charges), [charges])

  const hasPayments = !loading && !error && charges.length > 0
  const isSearching = search.trim().length > 0

  // Exports the whole record, not the filtered view: the file is the
  // resident's own archive of what they have paid, and a search term that
  // happened to be in the box when they clicked should not silently trim it.
  function handleExport() {
    const stamp = new Date().toISOString().slice(0, 10)
    const saved = downloadTextFile(
      `saken-payment-history-${stamp}.csv`,
      toPaymentHistoryCsv(charges),
      'text/csv;charset=utf-8;',
    )
    setExportError(saved ? '' : 'مرورگر شما امکان ذخیره فایل را ندارد.')
  }

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

        {hasPayments ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              خروجی اکسل (CSV)
            </button>
            <button
              type="button"
              onClick={onRetry}
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
            </button>
          </div>
        ) : null}
      </div>

      {exportError ? (
        <p role="alert" className="mb-4 text-xs font-bold text-rose-600">
          {exportError}
        </p>
      ) : null}

      {hasPayments ? (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <SummaryTile label="مجموع پرداختی" value={formatCurrency(totalPaid)} tone="emerald" />
            <SummaryTile label="تعداد پرداخت‌ها" value={`${summary.count} صورت‌حساب`} />
            <SummaryTile
              label="آخرین پرداخت"
              value={summary.latestPaidAt ? formatDate(summary.latestPaidAt) : 'ثبت نشده'}
            />
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="جستجو در تاریخچه پرداخت"
                placeholder="جستجو بر اساس عنوان یا مبلغ صورت‌حساب"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
            </div>

            <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-500">
              <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
              <span>ترتیب</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                aria-label="ترتیب نمایش تاریخچه پرداخت"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              >
                {paymentSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : null}

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
      ) : visibleCharges.length === 0 ? (
        // Distinct from the "no payments yet" copy above: the history is not
        // empty, the search simply matched nothing.
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400">
            <SearchX className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
            پرداختی مطابق «{search.trim()}» پیدا نشد.
          </p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="mt-4 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
          >
            نمایش همه پرداخت‌ها
          </button>
        </div>
      ) : (
        <>
          {isSearching ? (
            <p className="mb-3 text-xs font-bold text-slate-500" aria-live="polite">
              {visibleCharges.length} پرداخت از {charges.length} پرداخت نمایش داده می‌شود.
            </p>
          ) : null}

          <ul
            className={`space-y-3 transition-opacity ${refreshing ? 'opacity-60' : ''}`}
            aria-busy={refreshing}
          >
            {visibleCharges.map((charge) => (
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
                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                  <div className="text-base font-black text-slate-800">
                    {formatCurrency(charge.amount)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptCharge(charge)}
                    aria-label={`مشاهده رسید ${charge.title}`}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                  >
                    <Receipt className="h-4 w-4" />
                    رسید
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <PaymentReceiptModal
        open={receiptCharge !== null}
        charge={receiptCharge}
        onClose={() => setReceiptCharge(null)}
      />
    </section>
  )
}
