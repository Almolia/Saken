import {
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Wrench,
} from 'lucide-react'

const statusConfig = {
  pending: {
    label: 'در انتظار بررسی',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: Clock3,
  },
  assigned: {
    label: 'ارجاع‌شده',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
    icon: Wrench,
  },
  completed: {
    label: 'تکمیل‌شده',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
  },
}

function getStatusDetails(status) {
  const normalizedStatus = String(status || '').trim().toLowerCase()
  return (
    statusConfig[normalizedStatus] || {
      label: status || 'نامشخص',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
      icon: CircleAlert,
    }
  )
}

function StatusBadge({ status }) {
  const { label, className, icon: Icon } = getStatusDetails(status)

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function ServiceRequestCard({ serviceRequest }) {
  const isCompleted = String(serviceRequest.status || '').trim().toLowerCase() === 'completed'
  const report = serviceRequest.work_report?.trim()

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-base font-black text-slate-900">{serviceRequest.title}</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
            {serviceRequest.description}
          </p>
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

export function ServiceRequestList({ requests, loading, refreshing, error, onRetry }) {
  return (
    <section
      className="rounded-[2rem] border border-slate-200 bg-slate-100/70 p-5 sm:p-6"
      aria-labelledby="service-request-list-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="service-request-list-title" className="text-lg font-black text-slate-950">
            پیگیری درخواست‌ها
          </h2>
          <p className="mt-1 text-sm leading-7 text-slate-500">
            آخرین وضعیت درخواست‌های ثبت‌شده‌تان را در این بخش مشاهده کنید.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onRetry}
          disabled={loading || refreshing}
          aria-label="به‌روزرسانی درخواست‌ها"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm font-bold text-slate-500" role="status" aria-label="در حال بارگذاری درخواست‌های خدمات">
          <LoaderCircle className="h-5 w-5 animate-spin text-teal-600" />
          در حال بارگذاری درخواست‌ها...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-white px-5 py-6 text-center" role="alert">
          <CircleAlert className="mx-auto h-7 w-7 text-rose-500" />
          <h3 className="mt-3 font-black text-slate-900">دریافت درخواست‌ها ناموفق بود</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{error}</p>
          <button
            className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            type="button"
            onClick={onRetry}
          >
            تلاش مجدد
          </button>
        </div>
      ) : null}

      {!loading && !error && requests.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-900">هنوز درخواستی ثبت نشده است</h3>
          <p className="mt-2 text-sm leading-7 text-slate-500">برای شروع، فرم ثبت درخواست خدمات را تکمیل کنید.</p>
        </div>
      ) : null}

      {!loading && !error && requests.length > 0 ? (
        <div className="mt-6 space-y-3" aria-live="polite">
          {requests.map((serviceRequest) => (
            <ServiceRequestCard key={serviceRequest.id} serviceRequest={serviceRequest} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
