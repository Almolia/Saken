import { CalendarClock, ListChecks, LoaderCircle, Lock, Rocket, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { PollStatusBadge } from '../ui/PollStatusBadge'
import { managerPollApi } from '../../lib/pollApi'
import { formatDateTime } from '../../utils/helpers'
import { PollAction, optionCount, targetLabel } from '../../utils/polls'

/**
 * The confirmation for the three poll transitions that cannot be taken back.
 *
 * Publishing makes the question visible to residents and freezes it; closing
 * ends the voting for good — there is no reopen endpoint; deleting removes a
 * draft outright. Each gets the same shape so the manager always reads what is
 * about to happen before it happens.
 */
const actionConfig = {
  [PollAction.PUBLISH]: {
    title: 'انتشار نظرسنجی',
    description: 'با انتشار، این نظرسنجی برای ساکنان هدف قابل مشاهده و رأی‌دادن می‌شود.',
    note: 'پس از انتشار، پرسش و گزینه‌ها دیگر قابل ویرایش نیستند؛ اگر متن نیاز به اصلاح دارد، ابتدا آن را ویرایش کنید.',
    noteTone: 'bg-amber-50 text-amber-900',
    confirmLabel: 'بله، منتشر شود',
    busyLabel: 'در حال انتشار...',
    confirmClass: 'bg-teal-600 hover:bg-teal-700',
    icon: Rocket,
    fallbackMessage: 'نظرسنجی با موفقیت منتشر شد.',
    errorMessage: 'انتشار نظرسنجی ناموفق بود.',
    run: (poll) => managerPollApi.publish(poll.id),
  },
  [PollAction.CLOSE]: {
    title: 'بستن نظرسنجی',
    description: 'با بستن نظرسنجی، رأی‌گیری پایان می‌یابد و نتیجه نهایی می‌شود.',
    note: 'نظرسنجی بسته‌شده دوباره باز نمی‌شود؛ برای ادامه رأی‌گیری باید نظرسنجی تازه‌ای بسازید.',
    noteTone: 'bg-amber-50 text-amber-900',
    confirmLabel: 'بله، نظرسنجی بسته شود',
    busyLabel: 'در حال بستن...',
    confirmClass: 'bg-slate-900 hover:bg-slate-800',
    icon: Lock,
    fallbackMessage: 'نظرسنجی با موفقیت بسته شد.',
    errorMessage: 'بستن نظرسنجی ناموفق بود.',
    run: (poll) => managerPollApi.close(poll.id),
  },
  [PollAction.DELETE]: {
    title: 'حذف پیش‌نویس نظرسنجی',
    description: 'این پیش‌نویس برای همیشه حذف می‌شود و قابل بازیابی نیست.',
    note: 'فقط پیش‌نویس‌ها حذف می‌شوند. نظرسنجی منتشرشده ممکن است رأی داشته باشد، پس به جای حذف باید بسته شود.',
    noteTone: 'bg-rose-50 text-rose-900',
    confirmLabel: 'بله، پیش‌نویس حذف شود',
    busyLabel: 'در حال حذف...',
    confirmClass: 'bg-rose-600 hover:bg-rose-700',
    icon: Trash2,
    fallbackMessage: 'نظرسنجی با موفقیت حذف شد.',
    errorMessage: 'حذف نظرسنجی ناموفق بود.',
    run: (poll) => managerPollApi.remove(poll.id),
  },
}

export function PollActionModal({ open, action, poll, onClose, onReplaced, onRemoved }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const config = actionConfig[action]
  if (!open || !poll || !config) return null

  const Icon = config.icon

  async function handleConfirm() {
    setLoading(true)
    setError('')

    try {
      const response = await config.run(poll)
      // Delete answers with a message alone; the other two answer with the poll
      // re-read from the database, which is what the list then shows.
      if (action === PollAction.DELETE) onRemoved?.(poll.id)
      else onReplaced?.(response?.poll)
      showToast(response?.message || config.fallbackMessage)
      onClose()
    } catch (actionError) {
      const message = actionError.message || config.errorMessage
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      title={config.title}
      description={config.description}
      onClose={onClose}
      loading={loading}
      closeOnBackdrop={false}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm font-black leading-7 text-slate-900">{poll.title}</p>
            <PollStatusBadge status={poll.status} />
          </div>
          <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
            <div className="inline-flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
              <dt className="sr-only">تعداد گزینه‌ها</dt>
              <dd>{optionCount(poll)} گزینه</dd>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <dt className="sr-only">واحدهای هدف</dt>
              <dd>{targetLabel(poll)}</dd>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              <dt className="sr-only">مهلت رأی‌گیری</dt>
              <dd>{formatDateTime(poll.ends_at) || '—'}</dd>
            </div>
          </dl>
        </div>

        <p className={`rounded-xl px-4 py-3 text-xs leading-6 ${config.noteTone}`}>{config.note}</p>

        {error ? (
          <p className="text-xs font-bold text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${config.confirmClass}`}
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Icon className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? config.busyLabel : config.confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            انصراف
          </button>
        </div>
      </div>
    </Modal>
  )
}
