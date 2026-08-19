import { describe, expect, it } from 'vitest'
import {
  ReservationCategory,
  categorizeReservation,
  formatTimeRange,
  groupReservations,
  isCancelable,
  reservationStatusLabel,
  sortReservationLog,
  toReservationSearchQuery,
} from './reservations'

const now = new Date('2026-08-20T12:00:00Z').getTime()

function reservation(overrides) {
  return {
    id: 1,
    amenity: 1,
    amenity_name: 'باشگاه ورزشی',
    status: 'Active',
    start_time: '2026-08-21T08:00:00Z',
    end_time: '2026-08-21T09:00:00Z',
    ...overrides,
  }
}

describe('reservations', () => {
  describe('categorizeReservation', () => {
    it('files an active booking that has not started yet as upcoming', () => {
      expect(categorizeReservation(reservation(), now)).toBe(ReservationCategory.UPCOMING)
    })

    it('files an active booking that already ended as past', () => {
      const ended = reservation({
        start_time: '2026-08-19T08:00:00Z',
        end_time: '2026-08-19T09:00:00Z',
      })
      expect(categorizeReservation(ended, now)).toBe(ReservationCategory.PAST)
    })

    it('keeps a booking that is running right now under upcoming', () => {
      const running = reservation({
        start_time: '2026-08-20T11:00:00Z',
        end_time: '2026-08-20T13:00:00Z',
      })
      expect(categorizeReservation(running, now)).toBe(ReservationCategory.UPCOMING)
    })

    it('files canceled bookings as canceled whatever their times are', () => {
      const canceledFuture = reservation({ status: 'Canceled' })
      const canceledPast = reservation({
        status: 'Canceled',
        start_time: '2026-08-19T08:00:00Z',
        end_time: '2026-08-19T09:00:00Z',
      })
      expect(categorizeReservation(canceledFuture, now)).toBe(ReservationCategory.CANCELED)
      expect(categorizeReservation(canceledPast, now)).toBe(ReservationCategory.CANCELED)
    })
  })

  describe('isCancelable', () => {
    it('allows canceling only active bookings that have not started', () => {
      expect(isCancelable(reservation(), now)).toBe(true)
      expect(isCancelable(reservation({ status: 'Canceled' }), now)).toBe(false)
      expect(
        isCancelable(
          reservation({ start_time: '2026-08-20T11:00:00Z', end_time: '2026-08-20T13:00:00Z' }),
          now,
        ),
      ).toBe(false)
      expect(
        isCancelable(
          reservation({ start_time: '2026-08-19T08:00:00Z', end_time: '2026-08-19T09:00:00Z' }),
          now,
        ),
      ).toBe(false)
    })
  })

  describe('groupReservations', () => {
    const soon = reservation({ id: 1, start_time: '2026-08-21T08:00:00Z', end_time: '2026-08-21T09:00:00Z' })
    const later = reservation({ id: 2, start_time: '2026-08-25T08:00:00Z', end_time: '2026-08-25T09:00:00Z' })
    const oldest = reservation({ id: 3, start_time: '2026-08-10T08:00:00Z', end_time: '2026-08-10T09:00:00Z' })
    const recent = reservation({ id: 4, start_time: '2026-08-18T08:00:00Z', end_time: '2026-08-18T09:00:00Z' })
    const canceled = reservation({ id: 5, status: 'Canceled' })

    it('splits the list into upcoming, past and canceled', () => {
      const groups = groupReservations([later, oldest, canceled, soon, recent], now)

      expect(groups.upcoming.map((item) => item.id)).toEqual([1, 2])
      expect(groups.past.map((item) => item.id)).toEqual([4, 3])
      expect(groups.canceled.map((item) => item.id)).toEqual([5])
    })

    it('returns three empty buckets for an empty or missing list', () => {
      expect(groupReservations([], now)).toEqual({ upcoming: [], past: [], canceled: [] })
      expect(groupReservations(undefined, now)).toEqual({ upcoming: [], past: [], canceled: [] })
    })
  })

  describe('formatTimeRange', () => {
    it('renders the booked hours with latin digits', () => {
      // No timezone suffix, so both ends are parsed and rendered in local time.
      expect(formatTimeRange('2026-08-21T08:00:00', '2026-08-21T09:00:00')).toBe('08:00 تا 09:00')
    })

    it('returns an empty string when the times are missing', () => {
      expect(formatTimeRange(null, null)).toBe('')
      expect(formatTimeRange('not-a-date', 'not-a-date')).toBe('')
    })
  })
  describe('reservationStatusLabel', () => {
    it('reads the stored English status back in Persian', () => {
      expect(reservationStatusLabel('Active')).toBe('فعال')
      expect(reservationStatusLabel('Canceled')).toBe('لغوشده')
    })

    it('echoes an unknown status rather than blanking the cell', () => {
      expect(reservationStatusLabel('Expired')).toBe('Expired')
      expect(reservationStatusLabel('')).toBe('نامشخص')
    })
  })

  describe('toReservationSearchQuery', () => {
    it('leaves an amenity or resident name untouched', () => {
      expect(toReservationSearchQuery('استخر')).toBe('استخر')
      expect(toReservationSearchQuery('سارا احمدی')).toBe('سارا احمدی')
    })

    it('translates the Persian status the table displays into the stored value', () => {
      expect(toReservationSearchQuery('لغوشده')).toBe('Canceled')
      expect(toReservationSearchQuery('فعال')).toBe('Active')
    })

    it('consumes a two-word status whole so no stray word narrows the search', () => {
      // The endpoint ANDs the words of a query, so a leftover "شده" would
      // match nothing and empty the table.
      expect(toReservationSearchQuery('لغو شده')).toBe('Canceled')
      expect(toReservationSearchQuery('کنسل شده استخر')).toBe('Canceled استخر')
    })

    it('mixes a status with an amenity or resident name', () => {
      expect(toReservationSearchQuery('استخر لغوشده')).toBe('استخر Canceled')
    })

    it('passes an English status through unchanged', () => {
      expect(toReservationSearchQuery('Canceled')).toBe('Canceled')
    })

    it('normalizes half-spaces, arabic letters and stray whitespace', () => {
      expect(toReservationSearchQuery('  لغو\u200cشده  ')).toBe('Canceled')
      expect(toReservationSearchQuery('كنسل')).toBe('Canceled')
    })

    it('returns an empty query for empty input', () => {
      expect(toReservationSearchQuery('')).toBe('')
      expect(toReservationSearchQuery('   ')).toBe('')
      expect(toReservationSearchQuery(null)).toBe('')
    })
  })

  describe('sortReservationLog', () => {
    const older = reservation({ id: 1, start_time: '2026-08-01T08:00:00Z' })
    const newer = reservation({ id: 2, start_time: '2026-09-01T08:00:00Z' })

    it('puts the most recent booking at the top of the log', () => {
      expect(sortReservationLog([older, newer]).map((item) => item.id)).toEqual([2, 1])
    })

    it('does not mutate the list it was given', () => {
      const log = [older, newer]
      sortReservationLog(log)
      expect(log.map((item) => item.id)).toEqual([1, 2])
    })

    it('breaks a shared start time by id so rows never shuffle', () => {
      const twin = reservation({ id: 9, start_time: newer.start_time })
      expect(sortReservationLog([newer, twin]).map((item) => item.id)).toEqual([9, 2])
    })

    it('keeps a row with an unusable start time rather than dropping it', () => {
      const broken = reservation({ id: 3, start_time: 'not-a-date' })
      expect(sortReservationLog([broken, newer]).map((item) => item.id)).toEqual([2, 3])
    })

    it('survives a missing list', () => {
      expect(sortReservationLog(undefined)).toEqual([])
    })
  })
})
