import { ArrowDown, ArrowUp, ListChecks, Plus, Trash2 } from 'lucide-react'
import { POLL_MAX_OPTIONS, POLL_MIN_OPTIONS, POLL_OPTION_MAX } from '../../lib/validators'

function move(options, from, to) {
  if (to < 0 || to >= options.length) return options
  const next = [...options]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * The answer options a resident will choose between.
 *
 * The rows carry their own order: the server stores a `position` per option and
 * renders them by it, so reordering here is what decides the order residents
 * see. Two rows are always kept — that is the server's minimum, and a form that
 * can be emptied below it only produces a 400.
 */
export function PollOptionsField({ options, onChange, error = '', disabled = false }) {
  const canRemove = options.length > POLL_MIN_OPTIONS
  const canAdd = options.length < POLL_MAX_OPTIONS

  function updateAt(index, value) {
    onChange(options.map((option, position) => (position === index ? value : option)))
  }

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
        <ListChecks className="h-4 w-4 text-teal-600" aria-hidden="true" />
        گزینه‌های پاسخ
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500">
          حداقل {POLL_MIN_OPTIONS} گزینه
        </span>
      </legend>

      <ul className="space-y-2">
        {options.map((option, index) => (
          // The list is reordered in place, so an index key is what keeps a row
          // and its typed text together while it moves.
          <li key={index} className="flex items-center gap-2">
            <span
              className="flex h-11 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <input
              type="text"
              value={option}
              maxLength={POLL_OPTION_MAX}
              onChange={(event) => updateAt(index, event.target.value)}
              aria-label={`گزینه ${index + 1}`}
              placeholder={index === 0 ? 'مثلاً: بله، موافقم' : 'متن گزینه...'}
              className={`h-11 w-full min-w-0 rounded-2xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
              }`}
            />
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onChange(move(options, index, index - 1))}
                disabled={index === 0}
                aria-label={`انتقال گزینه ${index + 1} به بالا`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onChange(move(options, index, index + 1))}
                disabled={index === options.length - 1}
                aria-label={`انتقال گزینه ${index + 1} به پایین`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onChange(options.filter((_, position) => position !== index))}
                disabled={!canRemove}
                aria-label={`حذف گزینه ${index + 1}`}
                title={canRemove ? undefined : `نظرسنجی باید حداقل ${POLL_MIN_OPTIONS} گزینه داشته باشد.`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange([...options, ''])}
          disabled={!canAdd}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-4 text-xs font-bold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          افزودن گزینه
        </button>
        <small className="text-xs font-bold tabular-nums text-slate-400">
          {options.length} از {POLL_MAX_OPTIONS}
        </small>
      </div>

      {error ? (
        <small className="block text-xs font-medium text-rose-600" role="alert">
          {error}
        </small>
      ) : (
        <small className="block text-xs font-medium leading-6 text-slate-500">
          گزینه‌های خالی ذخیره نمی‌شوند؛ ترتیب گزینه‌ها همان چیزی است که ساکنان می‌بینند.
        </small>
      )}
    </fieldset>
  )
}
