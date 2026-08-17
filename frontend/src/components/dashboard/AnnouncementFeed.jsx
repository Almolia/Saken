import { BellRing, CircleAlert, LoaderCircle, Megaphone, RefreshCw } from 'lucide-react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { formatDate, formatRelativeDate } from '../../utils/helpers'

// Anything published within the last day is worth pointing at, since a resident
// checking the dashboard daily would not have seen it yet.
const NEW_FOR_MS = 24 * 60 * 60 * 1000

function isNew(announcement) {
  const published = new Date(announcement.created_at).getTime()
  if (Number.isNaN(published)) return false
  return Date.now() - published < NEW_FOR_MS
}

function AnnouncementCard({ announcement }) {
  const fresh = isNew(announcement)

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm transition sm:p-5 ${
        fresh ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            fresh ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-500'
          }`}
          aria-hidden="true"
        >
          <Megaphone className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-black text-slate-900">{announcement.title}</h3>
            {fresh ? (
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-black text-teal-700">
                جدید
              </span>
            ) : null}
          </div>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
            {announcement.content}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-400">
            {/* The relative label is the quick read; the exact date stays
                available on hover for anyone who needs it. */}
            <time dateTime={announcement.created_at} title={formatDate(announcement.created_at)}>
              {formatRelativeDate(announcement.created_at)}
            </time>
            {announcement.author_name ? <span>از طرف {announcement.author_name}</span> : null}
          </div>
        </div>
      </div>
    </article>
  )
}

export function AnnouncementFeed() {
  const { announcements, loading, refreshing, error, refresh } = useAnnouncements()

  return (
    <section
      className="rounded-[2rem] border border-slate-200 bg-slate-100/70 p-5 sm:p-6"
      aria-labelledby="announcement-feed-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="announcement-feed-title"
            className="flex items-center gap-2 text-lg font-black text-slate-950"
          >
            <BellRing className="h-5 w-5 text-teal-600" aria-hidden="true" />
            اطلاعیه‌های ساختمان
          </h2>
          <p className="mt-1 text-sm leading-7 text-slate-500">
            آخرین اطلاعیه‌های مدیریت ساختمان را در این بخش دنبال کنید.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={refresh}
          disabled={loading || refreshing}
          aria-label="به‌روزرسانی اطلاعیه‌ها"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
        </button>
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center gap-3 py-16 text-sm font-bold text-slate-500"
          role="status"
          aria-label="در حال بارگذاری اطلاعیه‌ها"
        >
          <LoaderCircle className="h-5 w-5 animate-spin text-teal-600" />
          در حال بارگذاری اطلاعیه‌ها...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-white px-5 py-6 text-center" role="alert">
          <CircleAlert className="mx-auto h-7 w-7 text-rose-500" />
          <h3 className="mt-3 font-black text-slate-900">دریافت اطلاعیه‌ها ناموفق بود</h3>
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

      {!loading && !error && announcements.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Megaphone className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-900">در حال حاضر اطلاعیه‌ای وجود ندارد</h3>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            هر اطلاعیه جدیدی که مدیریت ساختمان منتشر کند، همین‌جا نمایش داده می‌شود.
          </p>
        </div>
      ) : null}

      {!loading && !error && announcements.length > 0 ? (
        // The feed grows without bound as the building keeps publishing, so it
        // scrolls inside a fixed height instead of pushing the rest of the
        // dashboard down.
        <div
          className="mt-6 max-h-[30rem] space-y-3 overflow-y-auto pl-1"
          aria-live="polite"
          tabIndex={0}
        >
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
