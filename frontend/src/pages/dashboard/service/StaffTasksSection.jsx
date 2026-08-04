import {
  CheckCircle2,
  ClipboardList,
  MapPin,
  Phone,
  RefreshCw,
  UserRound,
  Wrench,
} from 'lucide-react'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { ServerError } from '../../../components/ui/ServerError'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { useStaffServiceRequests } from '../../../hooks/useStaffServiceRequests'
import { isCompleted as isRequestCompleted } from '../../../utils/serviceRequests'

function TaskCard({ serviceRequest }) {
  const isCompleted = isRequestCompleted(serviceRequest)
  const report = serviceRequest.work_report?.trim()
  const resident = serviceRequest.resident

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-black text-slate-900">{serviceRequest.title}</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
            {serviceRequest.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="font-bold">
                {serviceRequest.unit_number ? `واحد ${serviceRequest.unit_number}` : 'واحد نامشخص'}
              </span>
            </div>
            {resident?.full_name ? (
              <div className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                <span className="font-bold">{resident.full_name}</span>
              </div>
            ) : null}
            {resident?.phone ? (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span className="font-bold" dir="ltr">{resident.phone}</span>
              </div>
            ) : null}
          </div>
        </div>

        <StatusBadge status={serviceRequest.status} />
      </div>

      {isCompleted && report ? (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
          <p className="text-xs font-black text-emerald-800">گزارش انجام کار</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-emerald-950">{report}</p>
        </div>
      ) : null}
    </article>
  )
}

export function StaffTasksSection({ user }) {
  const { requests, loading, refreshing, error, refresh } = useStaffServiceRequests()

  const completedCount = requests.filter((item) => isRequestCompleted(item)).length
  const openCount = requests.length - completedCount

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">وظایف من</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            خوش آمدید، {user.full_name}
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            درخواست‌های خدماتی که به شما ارجاع شده است در این بخش نمایش داده می‌شود.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="کل وظایف" value={loading ? '—' : requests.length} icon={ClipboardList} tone="teal" />
        <SummaryCard title="در حال انجام" value={loading ? '—' : openCount} icon={Wrench} tone="emerald" />
        <SummaryCard title="تکمیل‌شده" value={loading ? '—' : completedCount} icon={CheckCircle2} tone="blue" />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">فهرست وظایف</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? 'در حال دریافت اطلاعات...' : `${requests.length} وظیفه به شما ارجاع شده است.`}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
          </button>
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
        ) : requests.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">هنوز وظیفه‌ای به شما ارجاع نشده است</h3>
            <p className="mt-2 text-sm text-slate-500">
              پس از ارجاع درخواست‌ها توسط مدیر، فهرست وظایف شما در این بخش نمایش داده می‌شود.
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-5 sm:p-6" aria-live="polite">
            {requests.map((serviceRequest) => (
              <TaskCard key={serviceRequest.id} serviceRequest={serviceRequest} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
