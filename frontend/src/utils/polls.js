// The API stores capitalised statuses ("Draft"/"Active"/"Closed"). These are
// the values sent back to the server; everything the UI compares against is the
// normalised lowercase form below.
export const PollApiStatus = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
}

export const PollStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed',
}

export const pollStatusLabels = {
  [PollStatus.DRAFT]: 'پیش‌نویس',
  [PollStatus.ACTIVE]: 'فعال',
  [PollStatus.CLOSED]: 'بسته‌شده',
}

// What each status means for the residents, spelled out wherever the badge
// alone would leave a manager guessing whether the poll is already visible.
export const pollStatusHints = {
  [PollStatus.DRAFT]: 'هنوز منتشر نشده و هیچ ساکنی آن را نمی‌بیند.',
  [PollStatus.ACTIVE]: 'منتشر شده و ساکنان هدف می‌توانند رأی بدهند.',
  [PollStatus.CLOSED]: 'رأی‌گیری پایان یافته و نتیجه نهایی است.',
}

const pollStatusTones = {
  [PollStatus.DRAFT]: 'border-slate-200 bg-slate-100 text-slate-700',
  [PollStatus.ACTIVE]: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  [PollStatus.CLOSED]: 'border-slate-300 bg-slate-800/5 text-slate-600',
}

export function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase()
}

// An unknown status is shown as-is rather than being relabelled, so a value
// added on the server side stays visible instead of disappearing.
export function pollStatusLabel(status) {
  return pollStatusLabels[normalizeStatus(status)] || status || 'نامشخص'
}

export function pollStatusTone(status) {
  return pollStatusTones[normalizeStatus(status)] || 'border-slate-200 bg-slate-50 text-slate-600'
}

export function isDraft(poll) {
  return normalizeStatus(poll?.status) === PollStatus.DRAFT
}

export function isActive(poll) {
  return normalizeStatus(poll?.status) === PollStatus.ACTIVE
}

export function isClosed(poll) {
  return normalizeStatus(poll?.status) === PollStatus.CLOSED
}

// The three transitions the backend accepts. Each is checked here as well so a
// button that would only earn a 400 is never offered in the first place.
export function canEdit(poll) {
  return isDraft(poll)
}

export function canPublish(poll) {
  return isDraft(poll)
}

export function canClose(poll) {
  return isActive(poll)
}

// Deleting is draft-only: an Active poll may already hold votes and a Closed
// one is the record of a building decision.
export function canDelete(poll) {
  return isDraft(poll)
}

// The three transitions that cannot be taken back. They live here rather than
// beside the confirmation dialog so the list can name an action without
// importing the modal that performs it.
export const PollAction = {
  PUBLISH: 'publish',
  CLOSE: 'close',
  DELETE: 'delete',
}

export function optionCount(poll) {
  return Array.isArray(poll?.options) ? poll.options.length : 0
}

// The options in the order the manager arranged them. The API sorts by position
// already, but a poll that came back from a write endpoint is worth re-sorting
// rather than trusting.
export function pollOptions(poll) {
  if (!Array.isArray(poll?.options)) return []
  return [...poll.options].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || (a.id ?? 0) - (b.id ?? 0),
  )
}

export function optionTexts(poll) {
  return pollOptions(poll).map((option) => option.text)
}

// An empty target list means the poll reaches the whole building — that is the
// server's own rule, and it is what makes "all units" the default in the form.
export function targetsAllUnits(poll) {
  return !Array.isArray(poll?.target_units) || poll.target_units.length === 0
}

export function targetUnitIds(poll) {
  return Array.isArray(poll?.target_units) ? poll.target_units : []
}

export function targetLabel(poll) {
  if (targetsAllUnits(poll)) return 'همه واحدها'
  return `${targetUnitIds(poll).length} واحد منتخب`
}

/**
 * The unit numbers a restricted poll targets.
 *
 * The poll only carries unit ids, so the labels are resolved against the unit
 * directory. An id with no matching unit still shows — as `#12` — because
 * silently dropping it would understate the poll's reach.
 */
export function targetUnitNumbers(poll, units = []) {
  const byId = new Map(units.map((unit) => [unit.id, unit]))
  return targetUnitIds(poll).map((id) => {
    const unit = byId.get(id)
    return unit ? `واحد ${unit.unit_number}` : `#${id}`
  })
}

// A resident sees only their own answer: the endpoint reports whether *this*
// resident has voted and which option they chose, and says nothing about anyone
// else's vote.
export function hasVoted(poll) {
  return Boolean(poll?.has_voted)
}

export function selectedOptionId(poll) {
  return poll?.selected_option_id ?? null
}

function toTime(value) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

export function hasEnded(poll, now = Date.now()) {
  const end = toTime(poll?.ends_at)
  return end !== null && end <= now
}

// An Active poll whose deadline has already passed still reads as "Active" in
// the database — the backend only refuses the votes. Surfacing that as its own
// state is what stops a manager thinking the poll is still collecting answers.
export function isExpiredActive(poll, now = Date.now()) {
  return isActive(poll) && hasEnded(poll, now)
}

// A draft whose deadline is already behind it is a dead end: publishing it
// produces an Active poll that refuses every vote, so the date has to be edited
// first. The server does not stop this — its publish branch validates the
// request body, and a publish never resends ends_at.
export function isStaleDraft(poll, now = Date.now()) {
  return isDraft(poll) && hasEnded(poll, now)
}

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

const relativeTimeFormatter = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' })

/**
 * How long is left before the poll closes, as "۳ روز دیگر" / "۲ ساعت دیگر".
 *
 * `now` is injectable so the tests never depend on the wall clock.
 */
export function remainingLabel(poll, now = Date.now()) {
  const end = toTime(poll?.ends_at)
  if (end === null) return ''
  if (end <= now) return 'مهلت به پایان رسیده'

  const remaining = end - now
  if (remaining >= DAY_MS) {
    return relativeTimeFormatter.format(Math.round(remaining / DAY_MS), 'day')
  }
  if (remaining >= HOUR_MS) {
    return relativeTimeFormatter.format(Math.round(remaining / HOUR_MS), 'hour')
  }
  return relativeTimeFormatter.format(Math.max(1, Math.round(remaining / MINUTE_MS)), 'minute')
}

// A deadline inside this window is worth flagging: it is close enough that a
// draft left unpublished is about to become pointless.
const ENDING_SOON_MS = 2 * DAY_MS

export function isEndingSoon(poll, now = Date.now()) {
  const end = toTime(poll?.ends_at)
  if (end === null || end <= now) return false
  return end - now <= ENDING_SOON_MS
}

// The list is served newest-first and every edit keeps its place, so the same
// ordering is reapplied locally after a create drops a record into the array.
export function sortPolls(polls = []) {
  return [...polls].sort((a, b) => {
    const created = (toTime(b?.created_at) ?? 0) - (toTime(a?.created_at) ?? 0)
    if (created !== 0) return created
    return (b?.id ?? 0) - (a?.id ?? 0)
  })
}

// The resident list is served by deadline, soonest first — the poll about to
// close is the one worth answering now — and the order is reapplied locally so
// a card updated in place cannot drift out of it.
export function sortResidentPolls(polls = []) {
  return [...polls].sort((a, b) => {
    const ends = (toTime(a?.ends_at) ?? Infinity) - (toTime(b?.ends_at) ?? Infinity)
    if (ends !== 0) return ends
    return (a?.id ?? 0) - (b?.id ?? 0)
  })
}

// What the sidebar badge counts: polls still waiting for this resident's vote.
// An expired one is not waiting for anything, so it is left out.
export function pendingVoteCount(polls = [], now = Date.now()) {
  return polls.filter((poll) => !hasVoted(poll) && !hasEnded(poll, now)).length
}

export function summarizePolls(polls = []) {
  let draft = 0
  let active = 0
  let closed = 0

  for (const poll of polls) {
    const status = normalizeStatus(poll.status)
    if (status === PollStatus.DRAFT) draft += 1
    else if (status === PollStatus.ACTIVE) active += 1
    else if (status === PollStatus.CLOSED) closed += 1
  }

  return { total: polls.length, draft, active, closed }
}

// Persian spellings a manager might reasonably type for a status. The whole
// master list is already in memory, so searching happens here rather than
// costing a request per keystroke.
const statusSearchTerms = {
  'پیش نویس': PollStatus.DRAFT,
  'پیش‌نویس': PollStatus.DRAFT,
  draft: PollStatus.DRAFT,
  فعال: PollStatus.ACTIVE,
  منتشر: PollStatus.ACTIVE,
  'منتشرشده': PollStatus.ACTIVE,
  active: PollStatus.ACTIVE,
  بسته: PollStatus.CLOSED,
  'بسته شده': PollStatus.CLOSED,
  'بسته‌شده': PollStatus.CLOSED,
  closed: PollStatus.CLOSED,
}

function normalizeTerm(term) {
  return String(term ?? '').trim().toLowerCase().replace(/‌/g, ' ').replace(/\s+/g, ' ')
}

export function matchesPollSearch(poll, term) {
  const needle = normalizeTerm(term)
  if (!needle) return true

  const statusMatch = statusSearchTerms[needle] || statusSearchTerms[needle.replace(/ /g, '‌')]
  if (statusMatch && normalizeStatus(poll?.status) === statusMatch) return true

  const haystack = [poll?.title, poll?.description, poll?.created_by_name, ...optionTexts(poll)]
    .map(normalizeTerm)
    .filter(Boolean)

  return haystack.some((value) => value.includes(needle))
}

export function filterPolls(polls = [], { status = 'all', search = '' } = {}) {
  const wanted = normalizeStatus(status)
  return polls.filter((poll) => {
    if (wanted && wanted !== 'all' && normalizeStatus(poll.status) !== wanted) return false
    return matchesPollSearch(poll, search)
  })
}

function pad(value) {
  return String(value).padStart(2, '0')
}

/**
 * Splits an API timestamp into the Gregorian ISO day and the `HH:MM` clock time
 * the form's two inputs each own, in the browser's own timezone.
 *
 * The pair round-trips through combineLocalDateTime, so reopening a draft shows
 * exactly the deadline that was saved.
 */
export function splitLocalDateTime(value) {
  const time = toTime(value)
  if (time === null) return { date: '', time: '' }

  const date = new Date(time)
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

/**
 * Builds the timestamp the API expects from the form's day and clock time.
 *
 * The two parts are read as local wall-clock time and sent as a fully qualified
 * UTC instant, so the deadline a manager typed is the deadline that comes back.
 */
export function combineLocalDateTime(dateValue, timeValue = '23:59') {
  const match = String(dateValue ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''

  const [year, month, day] = match.slice(1).map(Number)
  const clock = String(timeValue ?? '').match(/^(\d{1,2}):(\d{2})$/)
  const hours = clock ? Number(clock[1]) : 23
  const minutes = clock ? Number(clock[2]) : 59

  if (hours > 23 || minutes > 59) return ''

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}
