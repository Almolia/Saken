import {
  CalendarCheck,
  CalendarDays,
  CircleAlert,
  Clock,
  History,
  LoaderCircle,
  PlayCircle,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CancelReservationModal } from './CancelReservationModal'
import { formatDate } from '../../utils/helpers'
import {
  ReservationCategory,
  formatTimeRange,
  groupReservations,
  hasStarted,
  isCancelable,
} from '../../utils/reservations'

const tabs = [
  {
    key: ReservationCategory.UPCOMING,
    label: 'پیش‌رو',
    icon: CalendarCheck,
    activeClassName: 'bg-teal-600 text-white shadow-sm',
    countClassName: 'bg-teal-100 text-teal-800',
    emptyTitle: 'رزرو پیش‌رویی ندارید',
    emptyText: 'از بخش «امکانات و رزروها» می‌توانید بازه زمانی جدیدی رزرو کنید.',
  },
  {
    key: ReservationCategory.PAST,
    label: 'گذشته',
    icon: History,
    activeClassName: 'bg-slate-800 text-white shadow-sm',
    countClassName: 'bg-slate-200 text-slate-800',
    emptyTitle: 'هنوز رزرو گذشته‌ای ندارید',
    emptyText: 'رزروهایی که زمانشان به پایان برسد در این بخش بایگانی می‌شوند.',
  },
  {
    key: ReservationCategory.CANCELED,
    label: 'لغوشده',
    icon: XCircle,
    activeClassName: 'bg-rose-600 text-white shadow-sm',
    countClassName: 'bg-rose-100 text-rose-800',
    emptyTitle: 'رزرو لغوشده‌ای ندارید',
    emptyText: 'هر رزروی که لغو کنید برای پیگیری در این بخش باقی می‌ماند.',
  },
]

function ReservationBadge({ category, isRunning }) {
  let details = { label: 'پیش‌رو', className: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: CalendarCheck }

  if (category === ReservationCategory.CANCELED) {
    details = { label: 'لغو شده', className: 'border-rose-200 bg-rose-50 text-rose-800', icon: XCircle }
  } else if (category === ReservationCategory.PAST) {
    details = { label: 'برگزار شده', className: 'border-slate-200 bg-slate-100 text-slate-700', icon: History }
  } else if (isRunning) {
    details = { label: 'در حال استفاده', className: 'border-amber-200 bg-amber-50 text-amber-800', icon: PlayCircle }
  }

  const Icon = details.icon

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${details.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {details.label}
    </span>
  )
}

function ReservationCard({ reservation, category, now, onCancel }) {
  const isRunning = category === ReservationCategory.UPCOMING && hasStarted(reservation, now)
  const cancelable = isCancelable(reservation, now)
  const amenityName = reservation.amenity_name || `امکان #${reservation.amenity}`

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition sm:p-5 ${
        category === ReservationCategory.UPCOMING
          ? 'border-slate-200 bg-white hover:border-slate-300'
          : 'border-slate-100 bg-slate-50/80'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-base font-black text-slate-900">{amenityName}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
            {formatDate(reservation.start_time)}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            {formatTimeRange(reservation.start_time, reservation.end_time)}
          </p>
        </div>
        <ReservationBadge category={category} isRunning={isRunning} />
      </div>

      {cancelable ? (
        <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => onCancel(reservation)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
            aria-label={`لغو رزرو ${amenityName}`}
          >
            <Trash2 className="h-4 w-4" />
            لغو رزرو
          </button>
        </div>
      ) : null}

      {isRunning ? (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-6 text-slate-500">
          این رزرو هم‌اکنون در حال استفاده است و دیگر قابل لغو نیست.
        </p>
      ) : null}
    </article>
  )
}

export function MyReservationsSection({ reservations, loading, refreshing, error, onRetry, onCanceled }) {
  const [activeTab, setActiveTab] = useState(ReservationCategory.UPCOMING)
  const [reservationUnderCancellation, setReservationUnderCancellation] = useState(null)

  // Categorising depends on the current time, so the clock ticks on its own:
  // a booking moves from "upcoming" to "in progress" and then to "past" while
  // the dashboard stays open, without needing a refresh.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const groups = useMemo(() => groupReservations(reservations, now), [reservations, now])

  const activeTabConfig = tabs.find((tab) => tab.key === activeTab)
  const visibleReservations = groups[activeTab]

  return (
    <section
      className="rounded-[2rem] border border-slate-200 bg-slate-100/70 p-5 sm:p-6"
      aria-labelledby="my-reservations-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="my-reservations-title" className="text-lg font-black text-slate-950">
            رزروهای من
          </h2>
          <p className="mt-1 text-sm leading-7 text-slate-500">
            رزروهای پیش‌رو، گذشته و لغوشده‌تان را اینجا دنبال کنید و در صورت تغییر برنامه، رزرو پیش‌رو را لغو کنید.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onRetry}
          disabled={loading || refreshing}
          aria-label="به‌روزرسانی رزروها"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="دسته‌بندی رزروها">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab
          const Icon = tab.icon
          const count = groups[tab.key].length

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`reservations-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls="reservations-tabpanel"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition ${
                isActive ? tab.activeClassName : 'bg-white text-slate-700 shadow-sm hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black ${
                  isActive ? 'bg-white/20 text-white' : tab.countClassName
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div id="reservations-tabpanel" role="tabpanel" aria-labelledby={`reservations-tab-${activeTab}`}>
        {loading ? (
          <div
            className="flex items-center justify-center gap-3 py-16 text-sm font-bold text-slate-500"
            role="status"
            aria-label="در حال بارگذاری رزروها"
          >
            <LoaderCircle className="h-5 w-5 animate-spin text-teal-600" />
            در حال بارگذاری رزروها...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="mt-6 rounded-2xl border border-rose-100 bg-white px-5 py-6 text-center" role="alert">
            <CircleAlert className="mx-auto h-7 w-7 text-rose-500" />
            <h3 className="mt-3 font-black text-slate-900">دریافت رزروها ناموفق بود</h3>
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

        {!loading && !error && visibleReservations.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <CalendarDays className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">{activeTabConfig.emptyTitle}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">{activeTabConfig.emptyText}</p>
          </div>
        ) : null}

        {!loading && !error && visibleReservations.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-live="polite">
            {visibleReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                category={activeTab}
                now={now}
                onCancel={setReservationUnderCancellation}
              />
            ))}
          </div>
        ) : null}
      </div>

      {reservationUnderCancellation ? (
        <CancelReservationModal
          open
          reservation={reservationUnderCancellation}
          onClose={() => setReservationUnderCancellation(null)}
          onCanceled={onCanceled}
        />
      ) : null}
    </section>
  )
}
