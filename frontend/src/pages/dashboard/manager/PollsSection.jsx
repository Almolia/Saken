import {
  CalendarClock,
  CircleDot,
  Hourglass,
  ListChecks,
  Lock,
  PencilLine,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Trash2,
  TriangleAlert,
  UserRound,
  Users,
  Vote,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../../components/ToastProvider'
import { PollActionModal } from '../../../components/dashboard/PollActionModal'
import { PollFormModal } from '../../../components/dashboard/PollFormModal'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { PollStatusBadge } from '../../../components/ui/PollStatusBadge'
import { ServerError } from '../../../components/ui/ServerError'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { useManagerPolls } from '../../../hooks/useManagerPolls'
import { managerPollApi, pollResultsApi } from '../../../lib/pollApi'
import { PollResults } from '../../../components/dashboard/PollResults'
import { formatDate, formatDateTime } from '../../../utils/helpers'
import {
  PollAction,
  PollStatus,
  canClose,
  canDelete,
  canEdit,
  canPublish,
  isDraft,
  isEndingSoon,
  isExpiredActive,
  isStaleDraft,
  normalizeStatus,
  optionCount,
  optionTexts,
  pollStatusHints,
  remainingLabel,
  targetLabel,
  targetUnitNumbers,
  targetsAllUnits,
} from '../../../utils/polls'

const statusFilters = [
  { value: 'all', label: 'همه' },
  { value: PollStatus.DRAFT, label: 'پیش‌نویس' },
  { value: PollStatus.ACTIVE, label: 'فعال' },
  { value: PollStatus.CLOSED, label: 'بسته‌شده' },
]

// How many target units are named before the rest are summarised. A poll aimed
// at half the building should not push its own actions off the screen.
const VISIBLE_TARGET_UNITS = 6

function MetaItem({ icon: Icon, label, children }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <span>{children}</span>
    </div>
  )
}

function PollCard({ poll, units, onEdit, onAction, onResults }) {
  const options = optionTexts(poll)
  const expired = isExpiredActive(poll)
  const stale = isStaleDraft(poll)
  const endingSoon = isEndingSoon(poll)
  const targetNames = targetsAllUnits(poll) ? [] : targetUnitNumbers(poll, units)
  const statusHint = pollStatusHints[normalizeStatus(poll.status)]

  return (
    <li className={`px-5 py-5 transition sm:px-6 ${isDraft(poll) ? 'bg-slate-50/70' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-slate-950">{poll.title}</h3>
            <PollStatusBadge status={poll.status} />
            {endingSoon ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-800">
                <Hourglass className="h-3 w-3" aria-hidden="true" />
                {remainingLabel(poll)}
              </span>
            ) : null}
          </div>

          {statusHint ? (
            <p className="mt-1 text-xs font-medium text-slate-500">{statusHint}</p>
          ) : null}

          {poll.description ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{poll.description}</p>
          ) : null}

          {/* An Active poll past its deadline still reads as Active in the
              database — the server only refuses the votes — so the list says so
              rather than leaving a manager to work it out from the date. */}
          {expired ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              مهلت رأی‌گیری این نظرسنجی گذشته است و رأی تازه‌ای پذیرفته نمی‌شود. برای نهایی‌شدن نتیجه، آن را ببندید.
            </p>
          ) : null}

          {/* Publishing this draft as-is would produce an Active poll that
              refuses every vote; the server allows it, so the warning is the
              only thing standing between the manager and a dead poll. */}
          {stale ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              مهلت این پیش‌نویس گذشته است. اگر همین حالا منتشر شود هیچ ساکنی نمی‌تواند رأی بدهد؛ ابتدا تاریخ پایان را ویرایش کنید.
            </p>
          ) : null}

          <ul aria-label={`گزینه‌های «${poll.title}»`} className="mt-3 flex flex-wrap gap-1.5">
            {options.map((text, index) => (
              <li
                key={`${poll.id}-option-${index}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700"
              >
                <span className="text-[11px] font-black text-slate-400">{index + 1}</span>
                {text}
              </li>
            ))}
          </ul>

          {targetNames.length > 0 ? (
            <p className="mt-3 text-xs leading-6 text-slate-500">
              <span className="font-bold text-slate-600">واحدهای هدف: </span>
              {targetNames.slice(0, VISIBLE_TARGET_UNITS).join('، ')}
              {targetNames.length > VISIBLE_TARGET_UNITS
                ? ` و ${targetNames.length - VISIBLE_TARGET_UNITS} واحد دیگر`
                : ''}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
            <MetaItem icon={ListChecks} label="تعداد گزینه‌ها">{optionCount(poll)} گزینه</MetaItem>
            <MetaItem icon={Users} label="واحدهای هدف">{targetLabel(poll)}</MetaItem>
            <MetaItem icon={CalendarClock} label="مهلت رأی‌گیری">
              پایان: {formatDateTime(poll.ends_at) || '—'}
            </MetaItem>
            {poll.created_by_name ? (
              <MetaItem icon={UserRound} label="ایجادکننده">{poll.created_by_name}</MetaItem>
            ) : null}
            {poll.created_at ? (
              <MetaItem icon={Vote} label="تاریخ ایجاد">ایجاد: {formatDate(poll.created_at)}</MetaItem>
            ) : null}
          </div>
        </div>

        {/* Only the transitions the server would accept are offered; the rest
            would earn a 400 and are simply not rendered. */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" onClick={() => onResults(poll)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 text-xs font-bold text-teal-700 transition hover:bg-teal-50"><Vote className="h-3.5 w-3.5" aria-hidden="true" />نتایج</button>
          {canEdit(poll) ? (
            <button
              type="button"
              onClick={() => onEdit(poll)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
            >
              <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
              ویرایش
            </button>
          ) : null}
          {canPublish(poll) ? (
            <button
              type="button"
              onClick={() => onAction(PollAction.PUBLISH, poll)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700"
            >
              <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
              انتشار
            </button>
          ) : null}
          {canClose(poll) ? (
            <button
              type="button"
              onClick={() => onAction(PollAction.CLOSE, poll)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              بستن نظرسنجی
            </button>
          ) : null}
          {canDelete(poll) ? (
            <button
              type="button"
              onClick={() => onAction(PollAction.DELETE, poll)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              حذف
            </button>
          ) : null}
        </div>
      </div>
    </li>
  )
}

export function PollsSection() {
  const { showToast } = useToast()
  const {
    polls,
    visiblePolls,
    units,
    unitsError,
    summary,
    status,
    setStatus,
    search,
    setSearch,
    hasFilters,
    clearFilters,
    loading,
    refreshing,
    error,
    refresh,
    addPoll,
    replacePoll,
    removePoll,
  } = useManagerPolls()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [actionTarget, setActionTarget] = useState(null)
  const [resultsPoll, setResultsPoll] = useState(null)

  // Both handlers let the error escape: the modal catches it, shows it inline
  // and stays open with the typed poll intact.
  async function handleCreate(payload) {
    const response = await managerPollApi.create(payload)
    addPoll(response?.poll)
    showToast(response?.message || 'نظرسنجی با موفقیت ایجاد شد.')
  }

  async function handleUpdate(payload) {
    const response = await managerPollApi.update(editTarget.id, payload)
    replacePoll(response?.poll)
    showToast(response?.message || 'نظرسنجی با موفقیت به‌روزرسانی شد.')
  }

  const hasPolls = visiblePolls.length > 0

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">تصمیم‌گیری با ساکنان</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            نظرسنجی‌های ساختمان
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            برای تصمیم‌های مهم ساختمان نظرسنجی بسازید، آن را برای همه واحدها یا واحدهای منتخب منتشر کنید و هر زمان خواستید رأی‌گیری را ببندید. تا وقتی نظرسنجی پیش‌نویس است، هیچ ساکنی آن را نمی‌بیند.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="شاخص‌های نظرسنجی">
        <SummaryCard
          title="کل نظرسنجی‌ها"
          value={loading ? '—' : summary.total}
          icon={Vote}
          tone="teal"
          emphasized
        />
        <SummaryCard title="پیش‌نویس" value={loading ? '—' : summary.draft} icon={PencilLine} tone="amber" />
        <SummaryCard title="فعال" value={loading ? '—' : summary.active} icon={CircleDot} tone="emerald" />
        <SummaryCard title="بسته‌شده" value={loading ? '—' : summary.closed} icon={Lock} tone="blue" />
      </section>

      {unitsError ? (
        <section aria-label="خطای فهرست واحدها">
          <ServerError
            error={`${unitsError} شماره واحدهای هدف نمایش داده نمی‌شود و انتخاب واحد در فرم در دسترس نیست.`}
          />
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">فهرست نظرسنجی‌ها</h2>
              <p id="poll-count" className="mt-1 text-sm text-slate-500" aria-live="polite">
                {loading
                  ? 'در حال دریافت اطلاعات...'
                  : hasFilters
                    ? `${visiblePolls.length} نظرسنجی از ${polls.length} نظرسنجی نمایش داده می‌شود.`
                    : `${polls.length} نظرسنجی ثبت شده است.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={loading || refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                ایجاد نظرسنجی جدید
              </button>
            </div>
          </div>

          <label className="relative block">
            <span className="sr-only">جستجو در نظرسنجی‌ها</span>
            <Search
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="پرسش، توضیحات، متن گزینه‌ها یا وضعیت (مثلاً پیش‌نویس)..."
              autoComplete="off"
              aria-describedby="poll-count"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-11 text-sm font-bold text-slate-900 outline-none ring-teal-600/20 transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="پاک کردن جستجو"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="فیلتر وضعیت نظرسنجی">
            {statusFilters.map((filter) => {
              const selected = status === filter.value
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatus(filter.value)}
                  aria-pressed={selected}
                  className={`inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs font-bold transition ${
                    selected
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                حذف فیلترها
              </button>
            ) : null}
          </div>
        </div>

        {error && polls.length > 0 ? (
          <div className="border-b border-rose-100 px-5 py-4 sm:px-6">
            <ServerError error={`${error} فهرست قبلی همچنان نمایش داده می‌شود.`} />
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock />
        ) : error && polls.length === 0 ? (
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
        ) : !hasPolls ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Vote className="h-6 w-6" aria-hidden="true" />
            </div>
            {/* An empty building and an unmatched filter are different problems,
                and telling them apart is what stops a manager assuming the
                polls were lost. */}
            <h3 className="mt-4 text-lg font-black text-slate-900">
              {hasFilters ? 'نظرسنجی‌ای با این فیلترها پیدا نشد' : 'هنوز نظرسنجی‌ای ساخته نشده است'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {hasFilters
                ? 'عبارت جستجو یا وضعیت انتخاب‌شده را تغییر دهید تا نظرسنجی‌های دیگر را ببینید.'
                : 'با دکمه «ایجاد نظرسنجی جدید» اولین پرسش ساختمان را از ساکنان بپرسید.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
              >
                حذف فیلترها
              </button>
            ) : null}
          </div>
        ) : (
          <ul aria-label="نظرسنجی‌های ساختمان" className="divide-y divide-slate-100">
            {visiblePolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                units={units}
                onEdit={setEditTarget}
                onAction={(action, target) => setActionTarget({ action, poll: target })}
                onResults={setResultsPoll}
              />
            ))}
          </ul>
        )}
      </section>

      <PollFormModal
        open={createOpen}
        units={units}
        unitsError={unitsError}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <PollFormModal
        open={Boolean(editTarget)}
        poll={editTarget}
        units={units}
        unitsError={unitsError}
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
      />

      {resultsPoll ? <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-black">نتایج: {resultsPoll.title}</h2><button type="button" onClick={() => setResultsPoll(null)} className="text-sm font-bold text-slate-500">بستن</button></div><PollResults pollId={resultsPoll.id} fetchResults={pollResultsApi.manager} /></div> : null}

      <PollActionModal
        open={Boolean(actionTarget)}
        action={actionTarget?.action}
        poll={actionTarget?.poll}
        onClose={() => setActionTarget(null)}
        onReplaced={replacePoll}
        onRemoved={removePoll}
      />
    </>
  )
}
