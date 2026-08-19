// The API sends capitalised statuses ("Active"/"Canceled"). Everything in the
// UI compares against the normalised lowercase values, while the capitalised
// ones are what gets sent back to the server.
export const ReservationApiStatus = {
  ACTIVE: 'Active',
  CANCELED: 'Canceled',
}

export const ReservationStatus = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
}

// The three buckets the resident sees. A booking that has already started but
// has not finished yet is still shown under "upcoming" (it is not history yet),
// with its own badge and without a cancel button — see isCancelable below.
export const ReservationCategory = {
  UPCOMING: 'upcoming',
  PAST: 'past',
  CANCELED: 'canceled',
}

export const categoryLabels = {
  [ReservationCategory.UPCOMING]: 'رزروهای پیش‌رو',
  [ReservationCategory.PAST]: 'رزروهای گذشته',
  [ReservationCategory.CANCELED]: 'لغوشده‌ها',
}

export function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase()
}

export function isCanceled(reservation) {
  return normalizeStatus(reservation?.status) === ReservationStatus.CANCELED
}

// Returns the timestamp in milliseconds, or null when the value is missing or
// unparsable, so a malformed row never silently drops out of every bucket.
function toTime(value) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

export function hasStarted(reservation, now = Date.now()) {
  const start = toTime(reservation?.start_time)
  return start !== null && start <= now
}

export function hasEnded(reservation, now = Date.now()) {
  const end = toTime(reservation?.end_time)
  return end !== null && end <= now
}

export function categorizeReservation(reservation, now = Date.now()) {
  if (isCanceled(reservation)) return ReservationCategory.CANCELED
  if (hasEnded(reservation, now)) return ReservationCategory.PAST
  return ReservationCategory.UPCOMING
}

// The backend refuses to cancel a booking whose start time has passed, so the
// button is only offered while the slot is still entirely in the future.
export function isCancelable(reservation, now = Date.now()) {
  return !isCanceled(reservation) && !hasStarted(reservation, now)
}

// Splits the flat list the API returns into the three rendered buckets.
// Upcoming reads soonest-first (what the resident acts on next); the two
// historical buckets read most-recent-first.
export function groupReservations(reservations = [], now = Date.now()) {
  const groups = {
    [ReservationCategory.UPCOMING]: [],
    [ReservationCategory.PAST]: [],
    [ReservationCategory.CANCELED]: [],
  }

  for (const reservation of reservations) {
    groups[categorizeReservation(reservation, now)].push(reservation)
  }

  const byStartTime = (a, b) => (toTime(a?.start_time) ?? 0) - (toTime(b?.start_time) ?? 0)
  groups[ReservationCategory.UPCOMING].sort(byStartTime)
  groups[ReservationCategory.PAST].sort((a, b) => byStartTime(b, a))
  groups[ReservationCategory.CANCELED].sort((a, b) => byStartTime(b, a))

  return groups
}

// Latin digits, matching how the rest of the app renders numbers.
const timeFormatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// Exported for the manager's booking report, which shows the start and the
// end as separate columns rather than as one range.
export function formatClockTime(value) {
  const time = toTime(value)
  if (time === null) return ''
  return timeFormatter.format(new Date(time))
}

const formatTime = formatClockTime

export function formatTimeRange(startTime, endTime) {
  const start = formatTime(startTime)
  const end = formatTime(endTime)
  if (!start || !end) return start || end
  return `${start} تا ${end}`
}

// What the manager's booking report calls each status. The API stores the
// English values, so these labels exist only to be read.
export const reservationStatusLabels = {
  [ReservationStatus.ACTIVE]: 'فعال',
  [ReservationStatus.CANCELED]: 'لغوشده',
}

export function reservationStatusLabel(status) {
  return reservationStatusLabels[normalizeStatus(status)] || status || 'نامشخص'
}

// Persian spellings a manager might reasonably type for a status, mapped onto
// the value the API actually stores. Longer phrases come first so "لغو شده"
// is consumed whole rather than leaving a stray "شده" behind — the endpoint
// ANDs the words of a search, so an unmatched leftover would empty the table.
const statusSearchAliases = [
  { phrase: 'لغو شده', value: ReservationApiStatus.CANCELED },
  { phrase: 'لغوشده', value: ReservationApiStatus.CANCELED },
  { phrase: 'کنسل شده', value: ReservationApiStatus.CANCELED },
  { phrase: 'کنسل', value: ReservationApiStatus.CANCELED },
  { phrase: 'لغو', value: ReservationApiStatus.CANCELED },
  { phrase: 'فعال', value: ReservationApiStatus.ACTIVE },
]

function normalizeSearchText(value) {
  return String(value ?? '')
    .replace(/‌/g, ' ')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Rewrite what the manager typed into what the endpoint can match.
 *
 * The table shows Persian status labels while the database stores "Active"
 * and "Canceled", so searching for the word on screen would otherwise return
 * nothing. Every other word is passed through untouched: amenity names and
 * resident names are already stored the way they are typed.
 */
export function toReservationSearchQuery(search) {
  const words = normalizeSearchText(search).split(' ').filter(Boolean)
  if (words.length === 0) return ''

  const output = []
  let index = 0

  while (index < words.length) {
    const alias = statusSearchAliases.find((candidate) => {
      const phraseWords = candidate.phrase.split(' ')
      return phraseWords.every(
        (word, offset) => words[index + offset]?.toLowerCase() === word,
      )
    })

    if (alias) {
      output.push(alias.value)
      index += alias.phrase.split(' ').length
    } else {
      output.push(words[index])
      index += 1
    }
  }

  return output.join(' ')
}

// The report reads as a log of what happened, so the newest booking belongs at
// the top. This matches Reservation.Meta.ordering; the list endpoint overrides
// it with an ascending order that suits the resident's own upcoming bookings.
export function sortReservationLog(reservations) {
  if (!Array.isArray(reservations)) return []

  return [...reservations].sort((a, b) => {
    const left = toTime(a?.start_time)
    const right = toTime(b?.start_time)

    if (left === null && right === null) return (b?.id ?? 0) - (a?.id ?? 0)
    if (left === null) return 1
    if (right === null) return -1
    if (left !== right) return right - left

    return (b?.id ?? 0) - (a?.id ?? 0)
  })
}
