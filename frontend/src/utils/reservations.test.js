import { describe, expect, it } from 'vitest'
import {
  ReservationCategory,
  categorizeReservation,
  formatTimeRange,
  groupReservations,
  isCancelable,
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
})
