import {
  Calendar,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
  Search,
  Wrench,
  X,
} from 'lucide-react'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { ServerError } from '../../../components/ui/ServerError'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { useServiceReports } from '../../../hooks/useServiceReports'
import { formatDate } from '../../../utils/helpers'

export function ServiceReportsSection() {
  const {
    summary,
    requests,
    search,
    setSearch,
    clearSearch,
    loading,
    refreshing,
    searching,
    isDebouncing,
    error,
    summaryError,
    refresh,
  } = useServiceReports()

  const searchInProgress = searching || isDebouncing
  const hasRequests = requests.length > 0

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">گزارش خدمات ساختمان</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            آمار و گزارش درخواست‌های خدمات
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            مشاهده شاخص‌های تجمیعی، بررسی وضعیت لحظه‌ای کارها و جستجوی جامع در تمام درخواست‌های خدمات بر اساس واحد، ساکن، کارمند خدمات و وضعیت.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="شاخص‌های درخواست خدمات">
        <SummaryCard
          title="در انتظار بررسی"
          value={loading ? '—' : summary.Pending ?? 0}
          icon={Clock3}
          tone="amber"
          emphasized
        />
        <SummaryCard
          title="ارجاع‌شده"
          value={loading ? '—' : summary.Assigned ?? 0}
          icon={Wrench}
          tone="blue"
          emphasized
        />
        <SummaryCard
          title="تکمیل‌شده"
          value={loading ? '—' : summary.Completed ?? 0}
          icon={CheckCircle2}
          tone="emerald"
          emphasized
        />
      </section>

      {summaryError ? (
        <section aria-label="خطای آمار درخواست‌ها">
          <ServerError error={`${summaryError} برای دریافت دوباره آمار، از دکمه به‌روزرسانی استفاده کنید.`} />
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">فهرست گزارش درخواست‌ها</h2>
              <p id="service-request-count" className="mt-1 text-sm text-slate-500" aria-live="polite">
                {loading
                  ? 'در حال دریافت اطلاعات...'
                  : searchInProgress
                    ? 'در حال جستجو؛ نتایج قبلی تا دریافت پاسخ حفظ شده‌اند.'
                    : `${requests.length} درخواست نمایش داده می‌شود.`}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading || refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
            </button>
          </div>

          <label className="relative block">
            <span className="sr-only">جستجو در درخواست‌های خدمات</span>
            <Search
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجو بر اساس واحد، ساکن، کارمند خدمات، وضعیت، عنوان یا تاریخ..."
              autoComplete="off"
              aria-controls="service-requests-report-table"
              aria-describedby="service-request-count"
              aria-busy={searchInProgress}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-11 text-sm font-bold text-slate-900 outline-none ring-teal-600/20 transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4"
            />
            {searchInProgress ? (
              <LoaderCircle
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-teal-600"
                aria-hidden="true"
              />
            ) : search ? (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="پاک کردن جستجو"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>
        </div>

        {error && hasRequests ? (
          <div className="border-b border-rose-100 px-5 py-4 sm:px-6">
            <ServerError error={`${error} نتایج قبلی همچنان نمایش داده می‌شوند.`} />
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock />
        ) : error && !hasRequests ? (
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
        ) : requests.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">
              {search.trim()
                ? 'نتیجه‌ای برای این جستجو پیدا نشد'
                : 'هنوز درخواستی ثبت نشده است'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {search.trim()
                ? 'عبارت جستجو را تغییر دهید و دوباره تلاش کنید.'
                : 'پس از ثبت درخواست‌های خدمات توسط ساکنان، اطلاعات آن‌ها در این جدول گزارش نمایش داده می‌شود.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" aria-busy={searchInProgress}>
            <table
              id="service-requests-report-table"
              className="w-full min-w-[880px] text-right"
            >
              <caption className="sr-only">فهرست کامل گزارش درخواست‌های خدمات ساختمان</caption>
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-4">واحد</th>
                  <th scope="col" className="px-6 py-4">عنوان درخواست</th>
                  <th scope="col" className="px-6 py-4">ساکن</th>
                  <th scope="col" className="px-6 py-4">کارمند ارجاع‌شده</th>
                  <th scope="col" className="px-6 py-4">وضعیت</th>
                  <th scope="col" className="px-6 py-4">تاریخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {requests.map((request) => (
                  <tr key={request.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-black text-slate-950">
                      {request.unit_number ? `واحد ${request.unit_number}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-950">{request.title || '—'}</div>
                      {request.description ? (
                        <div className="mt-1 max-w-xs text-xs text-slate-500 line-clamp-2">
                          {request.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {request.resident?.full_name || '—'}
                      </div>
                      {request.resident?.phone ? (
                        <div className="mt-0.5 text-xs text-slate-500" dir="ltr">
                          {request.resident.phone}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      {request.assigned_staff ? (
                        <div>
                          <div className="font-bold text-slate-900">
                            {request.assigned_staff.full_name || '—'}
                          </div>
                          {request.assigned_staff.phone ? (
                            <div className="mt-0.5 text-xs text-slate-500" dir="ltr">
                              {request.assigned_staff.phone}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">تخصیص‌نیافته</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <span>{formatDate(request.created_at || request.date) || '—'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
