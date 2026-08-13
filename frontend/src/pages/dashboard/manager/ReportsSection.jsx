import { Calendar, CircleAlert, Receipt, RefreshCw, Search, Wallet } from 'lucide-react'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { ServerError } from '../../../components/ui/ServerError'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { useFinancialReports } from '../../../hooks/useFinancialReports'
import { formatCurrency, formatDate } from '../../../utils/helpers'

function statusMeta(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'paid') {
    return {
      label: 'پرداخت‌شده',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    }
  }
  if (normalized === 'pending') {
    return {
      label: 'پرداخت‌نشده',
      className: 'border-orange-200 bg-orange-50 text-orange-800',
    }
  }
  return {
    label: status || 'نامشخص',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
  }
}

export function ReportsSection() {
  const {
    summary,
    filteredRecords,
    search,
    setSearch,
    loading,
    refreshing,
    error,
    refresh,
    records,
  } = useFinancialReports()

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">گزارش مالی ساختمان</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            نمای کلی درآمد و بدهی‌ها
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            جمع مبالغ وصول‌شده و بدهی معوق را ببینید و با یک جستجوی متنی، سوابق مالی واحدها را فیلتر کنید.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          title="کل مبلغ وصول‌شده"
          value={loading ? '—' : formatCurrency(summary.total_collected_revenue)}
          icon={Wallet}
          tone="green"
        />
        <SummaryCard
          title="کل بدهی معوق"
          value={loading ? '—' : formatCurrency(summary.total_outstanding_debt)}
          icon={CircleAlert}
          tone="orange"
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">سوابق مالی واحدها</h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? 'در حال دریافت اطلاعات...'
                  : `${filteredRecords.length} از ${records.length} رکورد نمایش داده می‌شود.`}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading || refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
            </button>
          </div>

          <label className="relative block">
            <span className="sr-only">جستجو در سوابق مالی</span>
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجو بر اساس شماره واحد، عنوان، وضعیت یا مبلغ..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-900 outline-none ring-teal-600/20 transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4"
            />
          </label>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <div className="space-y-4 p-6">
            <ServerError error={error} />
            <button
              type="button"
              onClick={refresh}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              تلاش مجدد
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">
              {records.length === 0 ? 'هنوز سابقه مالی ثبت نشده است' : 'نتیجه‌ای برای این جستجو پیدا نشد'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {records.length === 0
                ? 'پس از صدور شارژ و پرداخت ساکنان، رکوردها اینجا نمایش داده می‌شوند.'
                : 'عبارت جستجو را تغییر دهید و دوباره تلاش کنید.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">شماره واحد</th>
                  <th className="px-6 py-4">عنوان</th>
                  <th className="px-6 py-4">وضعیت</th>
                  <th className="px-6 py-4">مبلغ</th>
                  <th className="px-6 py-4">تاریخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {filteredRecords.map((record) => {
                  const status = statusMeta(record.status)
                  return (
                    <tr key={record.id} className="transition hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-black text-slate-950">
                        واحد {record.unit_number || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-950">{record.title || '—'}</div>
                        {record.description ? (
                          <div className="mt-1 text-xs text-slate-500 line-clamp-2 max-w-md">
                            {record.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">
                        {formatCurrency(record.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>
                            {formatDate(record.due_date || record.created_at) || '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
