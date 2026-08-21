import { CircleAlert, LoaderCircle, RefreshCw, Vote } from 'lucide-react'
import { useToast } from '../ToastProvider'
import { PollVoteCard } from './PollVoteCard'
import { residentPollApi } from '../../lib/pollApi'

/**
 * The polls open to this resident, each with a single vote to cast.
 *
 * The data is owned by the dashboard page rather than this section, because the
 * sidebar badge needs the pending count whichever tab is showing.
 */
export function ResidentPollsSection({
  polls = [],
  loading = false,
  refreshing = false,
  error = '',
  refresh,
  markVoted,
  pendingCount = 0,
}) {
  const { showToast } = useToast()

  async function handleVote(poll, optionId) {
    try {
      const response = await residentPollApi.vote(poll.id, optionId)
      markVoted(poll.id, optionId)
      showToast(response?.message || 'رأی شما با موفقیت ثبت شد.')
    } catch (voteError) {
      showToast(voteError.message || 'ثبت رأی ناموفق بود.', 'error')
      // A refusal almost always means this card is out of date — the vote was
      // already cast elsewhere, or the deadline passed while the dashboard sat
      // open. Re-reading makes the list agree with the server instead of
      // leaving a button that would only fail again.
      refresh?.()
    }
  }

  const hasPolls = polls.length > 0

  return (
    <section
      className="rounded-[2rem] border border-slate-200 bg-slate-100/70 p-5 sm:p-6"
      aria-labelledby="resident-polls-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="resident-polls-title"
            className="flex items-center gap-2 text-lg font-black text-slate-950"
          >
            <Vote className="h-5 w-5 text-teal-600" aria-hidden="true" />
            نظرسنجی‌های ساختمان
          </h2>
          <p className="mt-1 text-sm leading-7 text-slate-500" aria-live="polite">
            {loading
              ? 'در حال دریافت نظرسنجی‌ها...'
              : pendingCount > 0
                ? `${pendingCount} نظرسنجی در انتظار رأی شماست. در هر نظرسنجی فقط یک بار می‌توانید رأی بدهید.`
                : 'در تصمیم‌های ساختمان شرکت کنید. در هر نظرسنجی فقط یک بار می‌توانید رأی بدهید.'}
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={refresh}
          disabled={loading || refreshing}
          aria-label="به‌روزرسانی نظرسنجی‌ها"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
        </button>
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center gap-3 py-16 text-sm font-bold text-slate-500"
          role="status"
          aria-label="در حال بارگذاری نظرسنجی‌ها"
        >
          <LoaderCircle className="h-5 w-5 animate-spin text-teal-600" aria-hidden="true" />
          در حال بارگذاری نظرسنجی‌ها...
        </div>
      ) : null}

      {/* A failed refresh keeps the cards it already has; only a first read with
          nothing to show falls back to the full error panel. */}
      {!loading && error && hasPolls ? (
        <div
          className="mt-6 rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm font-medium leading-7 text-rose-700"
          role="alert"
        >
          {error} فهرست قبلی همچنان نمایش داده می‌شود.
        </div>
      ) : null}

      {!loading && error && !hasPolls ? (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-white px-5 py-6 text-center" role="alert">
          <CircleAlert className="mx-auto h-7 w-7 text-rose-500" aria-hidden="true" />
          <h3 className="mt-3 font-black text-slate-900">دریافت نظرسنجی‌ها ناموفق بود</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{error}</p>
          <button
            className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            type="button"
            onClick={refresh}
          >
            تلاش مجدد
          </button>
        </div>
      ) : null}

      {!loading && !error && !hasPolls ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Vote className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-900">
            در حال حاضر نظرسنجی بازی وجود ندارد
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            هر نظرسنجی‌ای که مدیریت ساختمان منتشر کند و واحد شما را در بر بگیرد، همین‌جا برای رأی‌دادن نمایش داده می‌شود.
          </p>
        </div>
      ) : null}

      {!loading && hasPolls ? (
        <div className="mt-6 space-y-3">
          {polls.map((poll) => (
            <PollVoteCard
              key={poll.id}
              poll={poll}
              onVote={(optionId) => handleVote(poll, optionId)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
