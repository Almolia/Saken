const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export function toEnglishDigits(value) {
  return String(value ?? '').replace(/[۰-۹٠-٩]/g, (digit) => {
    const index = PERSIAN_DIGITS.indexOf(digit)
    return String(index >= 0 ? index : digit.charCodeAt(0) - '٠'.charCodeAt(0))
  })
}

function div(a, b) { return Math.floor(a / b) }
function mod(a, b) { return a - Math.floor(a / b) * b }

// The arithmetic is shared with the server implementation. Dates are kept as
// Gregorian ISO at the API boundary; only presentation and user input are Jalali.
export function jalaliToGregorian(jy, jm, jd) {
  jy += 1595
  let days = -355668 + 365 * jy + div(jy, 33) * 8 + div(mod(jy, 33) + 3, 4) + jd
  days += jm < 7 ? 31 * (jm - 1) : 30 * (jm - 7) + 186
  let gy = 400 * div(days, 146097)
  days = mod(days, 146097)
  if (days > 36524) {
    gy += 100 * div(--days, 36524)
    days = mod(days, 36524)
    if (days >= 365) days += 1
  }
  gy += 4 * div(days, 1461)
  days = mod(days, 1461)
  if (days > 365) { gy += div(days - 1, 365); days = mod(days - 1, 365) }
  let gd = days + 1
  const leap = gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0)
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let gm = 0
  while (gd > lengths[gm]) gd -= lengths[gm++]
  return { gy, gm: gm + 1, gd }
}

export function gregorianToJalali(gy, gm, gd) {
  const gDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy = gy <= 1600 ? 0 : 979
  gy -= gy <= 1600 ? 621 : 1600
  const gy2 = gm > 2 ? gy + 1 : gy
  let days = 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) - 80 + gd + gDays[gm - 1]
  jy += 33 * div(days, 12053)
  days = mod(days, 12053)
  jy += 4 * div(days, 1461)
  days = mod(days, 1461)
  if (days > 365) { jy += div(days - 1, 365); days = mod(days - 1, 365) }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30)
  const jd = 1 + (days < 186 ? mod(days, 31) : mod(days - 186, 30))
  return { jy, jm, jd }
}

export function formatIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isoToJalali(iso) {
  const match = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const result = gregorianToJalali(...match.slice(1).map(Number))
  return result
}

export function jalaliToIso(value) {
  const match = toEnglishDigits(value).trim().replaceAll('/', '-').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return null
  const [jy, jm, jd] = match.slice(1).map(Number)
  if (jy < 1200 || jy > 1600 || jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : 30)) return null
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd)
  const roundTrip = gregorianToJalali(gy, gm, gd)
  if (roundTrip.jy !== jy || roundTrip.jm !== jm || roundTrip.jd !== jd) return null
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
}

export function jalaliDateLabel(iso, { month = 'long' } = {}) {
  if (!iso) return ''
  const date = new Date(`${String(iso).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return String(iso)
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month, day: 'numeric' }).format(date)
}

export function jalaliMonthLength(year, month) {
  if (month <= 6) return 31
  if (month <= 11) return 30
  // Esfand is valid through 30 only in leap years (round-trip is authoritative).
  return jalaliToIso(`${year}-12-30`) ? 30 : 29
}
