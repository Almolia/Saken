import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Coins,
  Layers,
  Plus,
  Receipt,
  RefreshCw,
} from 'lucide-react'
import { useState } from 'react'
import { IssueChargeModal } from '../../../components/dashboard/IssueChargeModal'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { ServerError } from '../../../components/ui/ServerError'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { useManagerCharges } from '../../../hooks/useManagerCharges'
import { formatCurrency, formatDate } from '../../../utils/helpers'

export function FinancialsSection({ units = [] }) {
  const { charges, loading, refreshing, error, refresh, addCharge } = useManagerCharges()
  const [modalOpen, setModalOpen] = useState(false)

  const allUnitsChargesCount = charges.filter((c) => c.apply_to_all).length
  const latestCharge = charges[0]

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">امور مالی و صورت‌حساب‌ها</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            مدیریت و تاریخچه شارژهای دوره‌ای
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            در این بخش می‌توانید شارژهای دوره‌ای ساختمان را برای تمام یا برخی از واحدها تعریف و صادر کرده و سوابق شارژهای صادرشده را پیگیری کنید.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="کل شارژهای صادرشده"
          value={loading ? '—' : charges.length}
          icon={Receipt}
          tone="teal"
        />
        <SummaryCard
          title="شارژهای عمومی (تمام واحدها)"
          value={loading ? '—' : allUnitsChargesCount}
          icon={Building2}
          tone="emerald"
        />
        <SummaryCard
          title="آخرین مبلغ مصوب"
          value={loading ? '—' : latestCharge ? formatCurrency(latestCharge.amount) : '۰ تومان'}
          icon={Banknote}
          tone="blue"
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">تاریخچه شارژهای صادرشده</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? 'در حال دریافت اطلاعات...' : `${charges.length} شارژ دوره‌ای ثبت شده است.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading || refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              صدور شارژ جدید
            </button>
          </div>
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
        ) : charges.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">هنوز شارژی صادر نشده است</h3>
            <p className="mt-2 text-sm text-slate-500">
              با دکمه «صدور شارژ جدید» اولین شارژ دوره‌ای ساختمان را برای ساکنان تعریف و صادر کنید.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              صدور اولین شارژ
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">عنوان و توضیحات</th>
                  <th className="px-6 py-4">مبلغ هر واحد</th>
                  <th className="px-6 py-4">مهلت پرداخت</th>
                  <th className="px-6 py-4">واحدهای مشمول</th>
                  <th className="px-6 py-4">تاریخ صدور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {charges.map((charge) => (
                  <tr key={charge.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                          <Coins className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-950">{charge.title}</div>
                          {charge.description ? (
                            <div className="mt-1 text-xs text-slate-500 line-clamp-2 max-w-md">
                              {charge.description}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900">
                      {formatCurrency(charge.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{formatDate(charge.due_date) || charge.due_date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {charge.apply_to_all ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          تمام واحدها
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                          <Layers className="h-3.5 w-3.5" />
                          {charge.units_count ?? charge.units?.length ?? (charge.unit_ids?.length || 'چند')} واحد انتخابی
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {charge.created_at ? formatDate(charge.created_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <IssueChargeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onChargeIssued={addCharge}
        units={units}
      />
    </>
  )
}
