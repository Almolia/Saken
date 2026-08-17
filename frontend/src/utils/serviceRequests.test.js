import { describe, expect, it } from 'vitest'
import {
  countForStatus,
  isSettleable,
  sortOrderOptions,
  statusFilterOptions,
  StatusFilter,
  toApiStatus,
} from './serviceRequests'

describe('serviceRequests filtering helpers', () => {
  describe('toApiStatus', () => {
    it('maps a filter onto the capitalised value the API stores', () => {
      expect(toApiStatus(StatusFilter.PENDING)).toBe('Pending')
      expect(toApiStatus(StatusFilter.ASSIGNED)).toBe('Assigned')
      expect(toApiStatus(StatusFilter.COMPLETED)).toBe('Completed')
    })

    it('returns an empty query value for "all" and for anything unknown', () => {
      expect(toApiStatus(StatusFilter.ALL)).toBe('')
      expect(toApiStatus('nonsense')).toBe('')
      expect(toApiStatus(undefined)).toBe('')
    })

    it('accepts a status that already arrived capitalised', () => {
      expect(toApiStatus('Completed')).toBe('Completed')
    })
  })

  describe('countForStatus', () => {
    const summary = { Pending: 4, Assigned: 2, Completed: 3 }

    it('reads the count for one status', () => {
      expect(countForStatus(summary, StatusFilter.PENDING)).toBe(4)
      expect(countForStatus(summary, StatusFilter.COMPLETED)).toBe(3)
    })

    it('totals every status for "all"', () => {
      expect(countForStatus(summary, StatusFilter.ALL)).toBe(9)
    })

    it('returns null when the totals have not been read yet', () => {
      expect(countForStatus(null, StatusFilter.PENDING)).toBeNull()
      expect(countForStatus(undefined, StatusFilter.ALL)).toBeNull()
    })

    it('treats a status missing from the payload as zero', () => {
      expect(countForStatus({ Pending: 4 }, StatusFilter.COMPLETED)).toBe(0)
    })
  })

  describe('filter options', () => {
    it('covers all four tabs, each with its own empty-state copy', () => {
      expect(statusFilterOptions.map((option) => option.value)).toEqual([
        StatusFilter.ALL,
        StatusFilter.PENDING,
        StatusFilter.ASSIGNED,
        StatusFilter.COMPLETED,
      ])
      statusFilterOptions.forEach((option) => {
        expect(option.emptyTitle).toBeTruthy()
        expect(option.emptyBody).toBeTruthy()
      })
    })

    it('offers newest-first as the leading sort option', () => {
      expect(sortOrderOptions[0].value).toBe('-created_at')
      expect(sortOrderOptions.map((option) => option.value)).toEqual([
        '-created_at',
        'created_at',
      ])
    })
  })

  // Guards the behaviour the filter tabs lean on: a settled request still shows
  // under "Completed" but must not offer settlement again.
  describe('isSettleable', () => {
    it('is true only for a completed request that is not settled', () => {
      expect(isSettleable({ status: 'Completed', is_settled: false })).toBe(true)
      expect(isSettleable({ status: 'Completed', is_settled: true })).toBe(false)
      expect(isSettleable({ status: 'Pending', is_settled: false })).toBe(false)
    })
  })
})
