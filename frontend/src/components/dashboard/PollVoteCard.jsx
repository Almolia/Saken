import { CalendarClock, Check, CircleCheckBig, Hourglass, LoaderCircle, Send, Vote } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime } from '../../utils/helpers'
import { hasEnded, hasVoted, pollOptions, remainingLabel, selectedOptionId } from '../../utils/polls'
import { pollResultsApi } from '../../lib/pollApi'
import { PollResults } from './PollResults'

/**
 * One poll, with this resident's single vote.
 *
 * A poll is answerable only while it is still open and unanswered. Both of the
 * other states are shown rather than hidden: a resident who already voted wants
 * to see what they chose, and one who arrived too late deserves to be told so
 * instead of finding a dead button.
 */
export function PollVoteCard({ poll, onVote }) {
  const voted = hasVoted(poll)
  // The list arrives already filtered to open polls, but a card can outlive its
  // own deadline while the dashboard sits open.
  const expired = !voted && hasEnded(poll)
  const options = pollOptions(poll)
  const chosen = selectedOptionId(poll)

  const [choice, setChoice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const locked = voted || expired || submitting

  async function handleSubmit(event) {
    event.preventDefault()
    if (choice === null || locked) return

    setSubmitting(true)
    try {
      // The section owns the request and reports its own failure; the card only
      // needs to know the attempt is over.
      await onVote(choice)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition sm:p-5 ${
        voted
          ? 'border-emerald-200 bg-emerald-50/40'
          : expired
            ? 'border-slate-200 bg-slate-50/80'
            : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      aria-labelledby={`poll-${poll.id}-title`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            voted ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-50 text-teal-600'
          }`}
          aria-hidden="true"
        >
          {voted ? <CircleCheckBig className="h-5 w-5" /> : <Vote className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id={`poll-${poll.id}-title`}
              className="break-words text-base font-black text-slate-900"
            >
              {poll.title}
            </h3>
            {voted ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-800">
                رأی شما ثبت شد
              </span>
            ) : expired ? (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-black text-slate-600">
                مهلت تمام شد
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-800">
                در انتظار رأی شما
              </span>
            )}
          </div>

          {poll.description ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
              {poll.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">مهلت رأی‌گیری: </span>
              پایان: {formatDateTime(poll.ends_at) || '—'}
            </span>
            {!expired && remainingLabel(poll) ? (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                {remainingLabel(poll)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <form className="mt-4" onSubmit={handleSubmit}>
        <fieldset disabled={locked}>
          <legend className="mb-2 text-xs font-bold text-slate-600">
            {voted
              ? 'گزینه‌ای که انتخاب کردید:'
              : expired
                ? 'گزینه‌های این نظرسنجی:'
                : 'یکی از گزینه‌ها را انتخاب کنید:'}
          </legend>

          <div className="space-y-2">
            {options.map((option) => {
              const isChosen = voted && option.id === chosen
              const isPicked = !voted && choice === option.id

              return (
                <label
                  key={option.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm transition ${
                    isChosen
                      ? 'border-emerald-300 bg-emerald-50 font-bold text-emerald-900'
                      : isPicked
                        ? 'border-teal-500 bg-teal-50/70 font-bold text-teal-900 ring-2 ring-teal-100'
                        : 'border-slate-200 bg-white text-slate-700'
                  } ${locked ? 'cursor-default' : 'cursor-pointer hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <input
                      type="radio"
                      name={`poll-${poll.id}-option`}
                      value={option.id}
                      checked={voted ? option.id === chosen : choice === option.id}
                      onChange={() => setChoice(option.id)}
                      className="h-4 w-4 shrink-0 accent-teal-600"
                    />
                    <span className="break-words">{option.text}</span>
                  </span>
                  {isChosen ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black text-emerald-700">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      رأی شما
                    </span>
                  ) : null}
                </label>
              )
            })}
          </div>
        </fieldset>

        {voted ? (
          // Voting is once per poll and cannot be undone, so there is no button
          // left to offer — only the reason there isn't one.
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-6 text-emerald-900">
            رأی شما در این نظرسنجی ثبت شده است و قابل تغییر نیست. نتیجه نهایی پس از بسته‌شدن نظرسنجی توسط مدیریت اعلام می‌شود.
          </p>
        ) : expired ? (
          <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs leading-6 text-slate-600">
            مهلت رأی‌گیری این نظرسنجی به پایان رسیده و دیگر رأیی پذیرفته نمی‌شود.
          </p>
        ) : (
          <button
            type="submit"
            disabled={choice === null || submitting}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 sm:w-auto"
          >
            {submitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? 'در حال ثبت رأی...' : 'ثبت رأی'}
          </button>
        )}
      </form>
      {voted ? <button type="button" onClick={() => setShowResults((value) => !value)} className="mt-3 rounded-xl border border-teal-200 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50">{showResults ? 'بستن نتایج' : 'مشاهده نتایج'}</button> : null}
      {showResults ? <PollResults pollId={poll.id} fetchResults={pollResultsApi.resident} /> : null}
    </article>
  )
}
