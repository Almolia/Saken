import {
  ArrowDownUp,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LoaderCircle,
  RefreshCw,
  UserCheck,
  UserRound,
  Wallet,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../../components/ToastProvider'
import { SettlementModal } from '../../../components/dashboard/SettlementModal'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { ServerError } from '../../../components/ui/ServerError'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { formatCurrency } from '../../../utils/helpers'
import {
  countForStatus,
  isSettleable,
  normalizeStatus,
  paymentMethodLabels,
  RequestStatus,
  sortOrderOptions,
  statusFilterOptions,
  StatusFilter,
} from '../../../utils/serviceRequests'
import { useManagerServiceRequests } from '../../../hooks/useManagerServiceRequests'
import { useServiceStaff } from '../../../hooks/useServiceStaff'
import { managerServiceRequestApi } from '../../../lib/serviceRequestApi'

function AssignDropdown({ serviceRequest, staff, staffLoading, onUpdate }) {
  const { showToast } = useToast()
  // null means "untouched", so the select falls back to whoever currently owns
  // the request and resets to the new owner after a successful reassignment.
  const [draftStaffId, setDraftStaffId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentStaffId = serviceRequest.assigned_staff?.id
    ? String(serviceRequest.assigned_staff.id)
    : ''
  const selectedStaffId = draftStaffId ?? currentStaffId
  const isReassignment = Boolean(currentStaffId)
  const isUnchanged = selectedStaffId === currentStaffId

  async function handleAssign() {
    if (!selectedStaffId) {
      setError('لطفاً یک کارمند خدمات انتخاب کنید.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await managerServiceRequestApi.assignStaff(serviceRequest.id, {
        assigned_staff_id: Number(selectedStaffId),
      })
      onUpdate(response.request)
      showToast(response.message || 'درخواست با موفقیت ارجاع شد.')
      setDraftStaffId(null)
    } catch (err) {
      const message = err.message || 'ارجاع درخواست ناموفق بود.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={selectedStaffId}
        onChange={(e) => {
          setDraftStaffId(e.target.value)
          setError('')
        }}
        disabled={loading || staffLoading}
        aria-label={`مسئول درخواست ${serviceRequest.title}`}
        className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <option value="">انتخاب کارمند خدمات...</option>
        {staff.map((member) => (
          <option key={member.id} value={member.id}>
            {member.full_name} — {member.phone}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAssign}
        disabled={loading || staffLoading || !selectedStaffId || isUnchanged}
        title={isUnchanged && isReassignment ? 'برای تغییر مسئول، کارمند دیگری انتخاب کنید.' : undefined}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <UserCheck className="h-4 w-4" />
        )}
        {loading ? 'در حال ثبت...' : isReassignment ? 'تغییر مسئول' : 'ارجاع'}
      </button>
      {error ? (
        <small className="text-xs font-medium text-rose-600 sm:ml-2">{error}</small>
      ) : null}
    </div>
  )
}

function SettlementSummary({ serviceRequest }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800">
        <BadgeCheck className="h-4 w-4" />
        تسویه‌شده
      </span>
      {serviceRequest.cost != null ? (
        <span className="text-xs font-bold text-emerald-900">{formatCurrency(serviceRequest.cost)}</span>
      ) : null}
      {serviceRequest.payment_method ? (
        <span className="text-xs text-emerald-700">
          {paymentMethodLabels[serviceRequest.payment_method] || serviceRequest.payment_method}
        </span>
      ) : null}
    </div>
  )
}

function ServiceRequestCard({ serviceRequest, staff, staffLoading, onUpdate, onStartSettlement }) {
  const isCompleted = normalizeStatus(serviceRequest.status) === RequestStatus.COMPLETED
  const report = serviceRequest.work_report?.trim()

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-black text-slate-900">{serviceRequest.title}</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
            {serviceRequest.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {serviceRequest.resident ? (
              <div className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                <span className="font-bold">{serviceRequest.resident.full_name}</span>
              </div>
            ) : null}
            {serviceRequest.assigned_staff ? (
              <div className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                <span className="font-bold">{serviceRequest.assigned_staff.full_name}</span>
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

      {!isCompleted ? (
        staffLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            در حال بارگذاری کارکنان خدمات...
          </div>
        ) : staff.length > 0 ? (
          <AssignDropdown
            serviceRequest={serviceRequest}
            staff={staff}
            staffLoading={staffLoading}
            onUpdate={onUpdate}
          />
        ) : (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            هیچ کارمند خدماتی ثبت نشده است. ابتدا از بخش کاربران، نقش کاربران را به «کارکنان خدمات» تغییر دهید.
          </div>
        )
      ) : null}

      {serviceRequest.is_settled ? <SettlementSummary serviceRequest={serviceRequest} /> : null}

      {isSettleable(serviceRequest) ? (
        <button
          type="button"
          onClick={() => onStartSettlement(serviceRequest)}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Wallet className="h-4 w-4" />
          تسویه هزینه
        </button>
      ) : null}
    </article>
  )
}

function FilterTab({ option, count, active, disabled, onSelect }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={() => onSelect(option.value)}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? 'bg-slate-950 text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {option.label}
      {count == null ? null : (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[11px] font-black tabular-nums ${
            active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export function ServiceRequestsSection() {
  const {
    requests,
    summary,
    status,
    setStatus,
    ordering,
    setOrdering,
    loading,
    refreshing,
    error,
    refresh,
    updateRequest,
  } = useManagerServiceRequests()
  const { staff, loading: staffLoading } = useServiceStaff()
  const [settlingRequest, setSettlingRequest] = useState(null)

  // The cards report the building-wide totals from the summary endpoint, so
  // narrowing the list to one status does not make the other counts read zero.
  const pendingCount = countForStatus(summary, StatusFilter.PENDING)
  const assignedCount = countForStatus(summary, StatusFilter.ASSIGNED)
  const completedCount = countForStatus(summary, StatusFilter.COMPLETED)

  const activeFilter =
    statusFilterOptions.find((option) => option.value === status) || statusFilterOptions[0]
  const isFiltered = status !== StatusFilter.ALL

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">درخواست‌های خدمات</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            مدیریت و ارجاع درخواست‌ها
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            در این بخش می‌توانید درخواست‌های خدمات ثبت‌شده توسط ساکنان را مشاهده کرده، به کارکنان خدمات ارجاع دهید و تا پیش از تکمیل شدن، مسئول آن‌ها را تغییر دهید.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="در انتظار بررسی"
          value={pendingCount ?? '—'}
          icon={Clock3}
          tone="teal"
        />
        <SummaryCard
          title="ارجاع‌شده"
          value={assignedCount ?? '—'}
          icon={Wrench}
          tone="emerald"
        />
        <SummaryCard
          title="تکمیل‌شده"
          value={completedCount ?? '—'}
          icon={CheckCircle2}
          tone="blue"
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">فهرست درخواست‌ها</h2>
            <p className="mt-1 text-sm text-slate-500" aria-live="polite">
              {loading
                ? 'در حال دریافت اطلاعات...'
                : isFiltered
                  ? `${requests.length} درخواست با وضعیت «${activeFilter.label}».`
                  : `${requests.length} درخواست ثبت شده است.`}
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

        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div
            role="tablist"
            aria-label="فیلتر وضعیت درخواست‌ها"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {statusFilterOptions.map((option) => (
              <FilterTab
                key={option.value}
                option={option}
                count={countForStatus(summary, option.value)}
                active={option.value === status}
                disabled={loading}
                onSelect={setStatus}
              />
            ))}
          </div>

          <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-500">
            <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
            <span>ترتیب</span>
            <select
              value={ordering}
              onChange={(event) => setOrdering(event.target.value)}
              disabled={loading}
              aria-label="ترتیب نمایش بر اساس تاریخ ثبت"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {sortOrderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
        ) : requests.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <ClipboardList className="h-6 w-6" />
            </div>
            {/* The wording follows the active tab, so an empty "Completed" view
                explains itself instead of claiming nothing was ever filed. */}
            <h3 className="mt-4 text-lg font-black text-slate-900">{activeFilter.emptyTitle}</h3>
            <p className="mt-2 text-sm text-slate-500">{activeFilter.emptyBody}</p>
            {isFiltered ? (
              <button
                type="button"
                onClick={() => setStatus(StatusFilter.ALL)}
                className="mt-5 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
              >
                نمایش همه درخواست‌ها
              </button>
            ) : null}
          </div>
        ) : (
          // Dimmed rather than emptied while a new filter is on its way, so the
          // panel does not collapse and jump under the manager's cursor.
          <div
            className={`space-y-3 p-5 transition-opacity sm:p-6 ${refreshing ? 'opacity-60' : ''}`}
            aria-live="polite"
            aria-busy={refreshing}
          >
            {requests.map((serviceRequest) => (
              <ServiceRequestCard
                key={serviceRequest.id}
                serviceRequest={serviceRequest}
                staff={staff}
                staffLoading={staffLoading}
                onUpdate={updateRequest}
                onStartSettlement={setSettlingRequest}
              />
            ))}
          </div>
        )}
      </section>

      {settlingRequest ? (
        <SettlementModal
          open
          serviceRequest={settlingRequest}
          onClose={() => setSettlingRequest(null)}
          onSettled={updateRequest}
        />
      ) : null}
    </>
  )
}
