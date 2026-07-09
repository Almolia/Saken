import { Building2, CircleAlert, Home, Layers, RotateCcw, Ruler } from 'lucide-react'
import { formatArea } from '../../utils/helpers'

function UnitField({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-slate-200/70">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-bold text-slate-500">{label}</div>
      <div className="mt-2 break-words text-lg font-black text-slate-950">{value}</div>
    </div>
  )
}

function UnitFieldSkeleton() {
  return (
    <div className="animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 h-11 w-11 rounded-2xl bg-slate-200" />
      <div className="h-3 w-20 rounded-full bg-slate-200" />
      <div className="mt-3 h-5 w-28 rounded-full bg-slate-200" />
    </div>
  )
}

export function UnitInfoCard({ unit, loading, error, onRetry }) {
  return (
    <section aria-label="اطلاعات واحد" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">واحد من</h2>
          <p className="mt-1 text-sm text-slate-500">مشخصات واحد مسکونی ثبت‌شده برای شما</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3" role="status" aria-label="در حال بارگذاری اطلاعات واحد">
          <UnitFieldSkeleton />
          <UnitFieldSkeleton />
          <UnitFieldSkeleton />
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-start gap-4 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-white p-1.5 text-rose-600">
              <CircleAlert className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-800">دریافت اطلاعات واحد ناموفق بود</div>
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
      ) : unit ? (
        <div className="grid gap-4 md:grid-cols-3">
          <UnitField label="شماره واحد" value={unit.unit_number} icon={Home} />
          <UnitField label="طبقه" value={unit.floor} icon={Layers} />
          <UnitField label="متراژ" value={formatArea(unit.area)} icon={Ruler} />
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm font-medium leading-7 text-slate-600">
          هنوز واحدی برای شما ثبت نشده است. برای پیگیری با مدیر ساختمان تماس بگیرید.
        </div>
      )}
    </section>
  )
}
