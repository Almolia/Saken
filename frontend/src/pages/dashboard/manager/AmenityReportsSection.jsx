import {
  CalendarCheck,
  CalendarClock,
  CircleSlash,
  Clock,
  LoaderCircle,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { ServerError } from '../../../components/ui/ServerError'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { useAmenityReports } from '../../../hooks/useAmenityReports'
import { formatDate } from '../../../utils/helpers'
import {
  ReservationStatus,
  formatClockTime,
  normalizeStatus,
  reservationStatusLabel,
} from '../../../utils/reservations'

function StatusPill({ status }) {
  const normalized = normalizeStatus(status)
  const className =
    normalized === ReservationStatus.ACTIVE
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : normalized === ReservationStatus.CANCELED
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      {reservationStatusLabel(status)}
    </span>
  )
}

// One end of a booked slot: the Jalali day, with the clock time beneath it.
function MomentCell({ value }) {
  const day = formatDate(value)
  const time = formatClockTime(value)

  if (!day && !time) return <span className="text-slate-400">—</span>

  return (
    <div>
      <div className="font-bold text-slate-900">{day || '—'}</div>
      {time ? (
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span>{time}</span>
        </div>
      ) : null}
    </div>
  )
}

export function AmenityReportsSection() {
  const {
    reservations,
    amenities,
    amenitiesError,
    summary,
    search,
    setSearch,
    clearSearch,
    isDebouncing,
    amenity,
    setAmenity,
    date,
    setDate,
    hasFilters,
    clearFilters,
    loading,
    refreshing,
    searching,
    error,
    refresh,
  } = useAmenityReports()

  const searchInProgress = searching || isDebouncing
  const hasReservations = reservations.length > 0

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">گزارش رزرو امکانات</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            سوابق کامل رزرو فضاهای مشترک
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            تمام رزروهای ثبت‌شده روی همه امکانات ساختمان را ببینید و با یک جستجوی متنی، بر اساس نام امکان، وضعیت رزرو یا نام ساکن فیلتر کنید.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="شاخص‌های رزرو امکانات">
        <SummaryCard
          title="رزروهای نمایش‌داده‌شده"
          value={loading ? '—' : summary.total}
          icon={CalendarCheck}
          tone="teal"
          emphasized
        />
        <SummaryCard
          title="رزروهای فعال"
          value={loading ? '—' : summary.active}
          icon={CalendarClock}
          tone="emerald"
          emphasized
        />
        <SummaryCard
          title="رزروهای لغوشده"
          value={loading ? '—' : summary.canceled}
          icon={CircleSlash}
          tone="red"
          emphasized
        />
      </section>

      {amenitiesError ? (
        <section aria-label="خطای فهرست امکانات">
          <ServerError
            error={`${amenitiesError} فیلتر امکان در دسترس نیست؛ جستجوی متنی همچنان کار می‌کند.`}
          />
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">فهرست رزروها</h2>
              <p id="amenity-reservation-count" className="mt-1 text-sm text-slate-500" aria-live="polite">
                {loading
                  ? 'در حال دریافت اطلاعات...'
                  : searchInProgress
                    ? 'در حال جستجو؛ نتایج قبلی تا دریافت پاسخ حفظ شده‌اند.'
                    : `${reservations.length} رزرو نمایش داده می‌شود.`}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading || refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
            </button>
          </div>

          <label className="relative block">
            <span className="sr-only">جستجو در رزروهای امکانات</span>
            <Search
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="نام امکان (مثلاً استخر)، وضعیت (مثلاً لغوشده) یا نام ساکن..."
              autoComplete="off"
              aria-controls="amenity-reservations-table"
              aria-describedby="amenity-reservation-count"
              aria-busy={searchInProgress}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-11 text-sm font-bold text-slate-900 outline-none ring-teal-600/20 transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4"
            />
            {searchInProgress ? (
              <LoaderCircle
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-teal-600"
                aria-hidden="true"
              />
            ) : search ? (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="پاک کردن جستجو"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>

          {/* The endpoint filters by amenity and by day as well; keeping both
              beside the text box means narrowing to one facility never depends
              on spelling its name correctly. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex flex-1 items-center gap-2 text-xs font-bold text-slate-500">
              <span className="shrink-0">امکان</span>
              <select
                value={amenity}
                onChange={(event) => setAmenity(event.target.value)}
                aria-label="فیلتر بر اساس امکان"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              >
                <option value="">همه امکانات</option>
                {amenities.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-1 items-center gap-2 text-xs font-bold text-slate-500">
              <span className="shrink-0">روز</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                aria-label="فیلتر بر اساس روز رزرو"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
            </label>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                حذف همه فیلترها
              </button>
            ) : null}
          </div>
        </div>

        {error && hasReservations ? (
          <div className="border-b border-rose-100 px-5 py-4 sm:px-6">
            <ServerError error={`${error} نتایج قبلی همچنان نمایش داده می‌شوند.`} />
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock />
        ) : error && !hasReservations ? (
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
        ) : reservations.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <CalendarCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            {/* An empty log and an unmatched filter are different problems, and
                telling them apart is what stops a manager assuming the data
                was lost. */}
            <h3 className="mt-4 text-lg font-black text-slate-900">
              {hasFilters ? 'رزروی با این فیلترها پیدا نشد' : 'هنوز رزروی ثبت نشده است'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {hasFilters
                ? 'عبارت جستجو یا فیلترها را تغییر دهید؛ برای دیدن همه رزروها می‌توانید فیلترها را حذف کنید.'
                : 'پس از رزرو امکانات ساختمان توسط ساکنان، سوابق آن‌ها در این جدول نمایش داده می‌شود.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
              >
                حذف همه فیلترها
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto" aria-busy={searchInProgress}>
            <table id="amenity-reservations-table" className="w-full min-w-[880px] text-right">
              <caption className="sr-only">فهرست کامل رزروهای امکانات ساختمان</caption>
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-4">امکان</th>
                  <th scope="col" className="px-6 py-4">ساکن</th>
                  <th scope="col" className="px-6 py-4">زمان شروع</th>
                  <th scope="col" className="px-6 py-4">زمان پایان</th>
                  <th scope="col" className="px-6 py-4">وضعیت</th>
                  <th scope="col" className="px-6 py-4">تاریخ ثبت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-black text-slate-950">
                      {reservation.amenity_name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {reservation.resident_name || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <MomentCell value={reservation.start_time} />
                    </td>
                    <td className="px-6 py-4">
                      <MomentCell value={reservation.end_time} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={reservation.status} />
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      {formatDate(reservation.created_at) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
