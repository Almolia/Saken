import { describe, expect, it } from 'vitest'
import {
  PollApiStatus,
  PollStatus,
  canClose,
  canDelete,
  canEdit,
  canPublish,
  combineLocalDateTime,
  filterPolls,
  hasEnded,
  isEndingSoon,
  isExpiredActive,
  isStaleDraft,
  matchesPollSearch,
  hasVoted,
  optionCount,
  optionTexts,
  pendingVoteCount,
  pollOptions,
  pollStatusLabel,
  remainingLabel,
  selectedOptionId,
  sortPolls,
  sortResidentPolls,
  splitLocalDateTime,
  summarizePolls,
  targetLabel,
  targetUnitNumbers,
  targetsAllUnits,
} from './polls'

const now = new Date('2026-08-20T12:00:00Z').getTime()

function poll(overrides = {}) {
  return {
    id: 1,
    title: 'انتخاب رنگ نمای ساختمان',
    description: 'نمای ساختمان امسال بازسازی می‌شود.',
    status: PollApiStatus.ACTIVE,
    starts_at: '2026-08-19T08:00:00Z',
    ends_at: '2026-08-25T12:00:00Z',
    target_units: [],
    options: [
      { id: 1, text: 'کرم', position: 0 },
      { id: 2, text: 'خاکستری', position: 1 },
    ],
    created_by_name: 'مدیر ساختمان',
    created_at: '2026-08-18T08:00:00Z',
    total_units: 12,
    ...overrides,
  }
}

describe('polls', () => {
  describe('pollStatusLabel', () => {
    it('translates each stored status', () => {
      expect(pollStatusLabel('Draft')).toBe('پیش‌نویس')
      expect(pollStatusLabel('Active')).toBe('فعال')
      expect(pollStatusLabel('Closed')).toBe('بسته‌شده')
    })

    it('shows an unknown status as-is instead of hiding it', () => {
      expect(pollStatusLabel('Archived')).toBe('Archived')
    })
  })

  describe('allowed actions', () => {
    it('allows editing, publishing and deleting only while the poll is a draft', () => {
      const draft = poll({ status: PollApiStatus.DRAFT })
      expect(canEdit(draft)).toBe(true)
      expect(canPublish(draft)).toBe(true)
      expect(canDelete(draft)).toBe(true)
      expect(canClose(draft)).toBe(false)
    })

    it('allows only closing an active poll', () => {
      const active = poll()
      expect(canClose(active)).toBe(true)
      expect(canEdit(active)).toBe(false)
      expect(canDelete(active)).toBe(false)
    })

    it('offers nothing on a closed poll', () => {
      const closed = poll({ status: PollApiStatus.CLOSED })
      expect(canEdit(closed)).toBe(false)
      expect(canPublish(closed)).toBe(false)
      expect(canClose(closed)).toBe(false)
      expect(canDelete(closed)).toBe(false)
    })
  })

  describe('options', () => {
    it('counts the answer options', () => {
      expect(optionCount(poll())).toBe(2)
      expect(optionCount({})).toBe(0)
    })

    it('reads the option texts back in their stored display order', () => {
      const shuffled = poll({
        options: [
          { id: 2, text: 'خاکستری', position: 1 },
          { id: 1, text: 'کرم', position: 0 },
        ],
      })
      expect(optionTexts(shuffled)).toEqual(['کرم', 'خاکستری'])
    })
  })

  describe('the resident view of a poll', () => {
    it('reports whether this resident has answered', () => {
      expect(hasVoted(poll({ has_voted: true }))).toBe(true)
      expect(hasVoted(poll())).toBe(false)
      expect(hasVoted(undefined)).toBe(false)
    })

    it('reads back the option this resident chose', () => {
      expect(selectedOptionId(poll({ selected_option_id: 2 }))).toBe(2)
      // Not voted yet is null, never a stray zero that could match an option id.
      expect(selectedOptionId(poll())).toBeNull()
    })

    it('keeps the options in the order the manager arranged them', () => {
      const shuffled = poll({
        options: [
          { id: 2, text: 'خاکستری', position: 1 },
          { id: 1, text: 'کرم', position: 0 },
        ],
      })
      expect(pollOptions(shuffled).map((option) => option.id)).toEqual([1, 2])
      expect(pollOptions({})).toEqual([])
    })

    it('orders the resident list by deadline, soonest first', () => {
      const later = poll({ id: 1, ends_at: '2026-09-10T12:00:00Z' })
      const sooner = poll({ id: 2, ends_at: '2026-08-25T12:00:00Z' })
      expect(sortResidentPolls([later, sooner]).map((item) => item.id)).toEqual([2, 1])
    })

    it('puts a poll with no deadline last rather than first', () => {
      const dated = poll({ id: 1, ends_at: '2026-09-10T12:00:00Z' })
      const undated = poll({ id: 2, ends_at: null })
      expect(sortResidentPolls([undated, dated]).map((item) => item.id)).toEqual([1, 2])
    })

    it('counts only the polls still waiting for a vote', () => {
      const polls = [
        poll({ id: 1 }),
        poll({ id: 2, has_voted: true }),
        // Expired: nothing is waiting on the resident any more.
        poll({ id: 3, ends_at: '2026-08-19T12:00:00Z' }),
      ]
      expect(pendingVoteCount(polls, now)).toBe(1)
      expect(pendingVoteCount([], now)).toBe(0)
    })
  })

  describe('targeting', () => {
    it('treats an empty target list as the whole building', () => {
      expect(targetsAllUnits(poll())).toBe(true)
      expect(targetLabel(poll())).toBe('همه واحدها')
    })

    it('counts the units of a restricted poll', () => {
      expect(targetLabel(poll({ target_units: [3, 4, 5] }))).toBe('3 واحد منتخب')
    })

    it('resolves target ids into unit numbers', () => {
      const units = [
        { id: 3, unit_number: '101' },
        { id: 4, unit_number: '102' },
      ]
      expect(targetUnitNumbers(poll({ target_units: [3, 4] }), units)).toEqual([
        'واحد 101',
        'واحد 102',
      ])
    })

    it('keeps an id with no matching unit visible rather than dropping it', () => {
      expect(targetUnitNumbers(poll({ target_units: [9] }), [])).toEqual(['#9'])
    })
  })

  describe('deadlines', () => {
    it('detects a deadline that has passed', () => {
      expect(hasEnded(poll(), now)).toBe(false)
      expect(hasEnded(poll({ ends_at: '2026-08-19T12:00:00Z' }), now)).toBe(true)
    })

    it('flags an active poll whose voting window already closed', () => {
      const expired = poll({ ends_at: '2026-08-19T12:00:00Z' })
      expect(isExpiredActive(expired, now)).toBe(true)
      expect(isExpiredActive(poll(), now)).toBe(false)
    })

    it('does not call a draft expired just because its deadline passed', () => {
      const stale = poll({ status: PollApiStatus.DRAFT, ends_at: '2026-08-19T12:00:00Z' })
      expect(isExpiredActive(stale, now)).toBe(false)
    })

    it('flags a draft whose deadline is already behind it', () => {
      const stale = poll({ status: PollApiStatus.DRAFT, ends_at: '2026-08-19T12:00:00Z' })
      expect(isStaleDraft(stale, now)).toBe(true)
      expect(isStaleDraft(poll({ status: PollApiStatus.DRAFT }), now)).toBe(false)
      // A published poll past its deadline is expired, not stale.
      expect(isStaleDraft(poll({ ends_at: '2026-08-19T12:00:00Z' }), now)).toBe(false)
    })

    it('flags a deadline inside the next two days as ending soon', () => {
      expect(isEndingSoon(poll({ ends_at: '2026-08-21T12:00:00Z' }), now)).toBe(true)
      expect(isEndingSoon(poll(), now)).toBe(false)
      expect(isEndingSoon(poll({ ends_at: '2026-08-19T12:00:00Z' }), now)).toBe(false)
    })

    it('describes how long is left', () => {
      expect(remainingLabel(poll(), now)).toContain('روز')
      expect(remainingLabel(poll({ ends_at: '2026-08-20T15:00:00Z' }), now)).toContain('ساعت')
      expect(remainingLabel(poll({ ends_at: '2026-08-19T12:00:00Z' }), now)).toBe(
        'مهلت به پایان رسیده',
      )
    })

    it('returns nothing when there is no deadline to describe', () => {
      expect(remainingLabel({ ends_at: null }, now)).toBe('')
    })
  })

  describe('sortPolls', () => {
    it('orders the list newest-first the way the endpoint serves it', () => {
      const older = poll({ id: 1, created_at: '2026-08-10T08:00:00Z' })
      const newer = poll({ id: 2, created_at: '2026-08-18T08:00:00Z' })
      expect(sortPolls([older, newer]).map((item) => item.id)).toEqual([2, 1])
    })

    it('falls back to the id when two polls share a creation time', () => {
      const first = poll({ id: 5, created_at: '2026-08-10T08:00:00Z' })
      const second = poll({ id: 6, created_at: '2026-08-10T08:00:00Z' })
      expect(sortPolls([first, second]).map((item) => item.id)).toEqual([6, 5])
    })
  })

  describe('summarizePolls', () => {
    it('counts the polls in each status', () => {
      const polls = [
        poll({ id: 1, status: PollApiStatus.DRAFT }),
        poll({ id: 2, status: PollApiStatus.ACTIVE }),
        poll({ id: 3, status: PollApiStatus.ACTIVE }),
        poll({ id: 4, status: PollApiStatus.CLOSED }),
      ]
      expect(summarizePolls(polls)).toEqual({ total: 4, draft: 1, active: 2, closed: 1 })
    })
  })

  describe('matchesPollSearch', () => {
    it('matches an empty term against everything', () => {
      expect(matchesPollSearch(poll(), '   ')).toBe(true)
    })

    it('matches the title, the description and the option texts', () => {
      expect(matchesPollSearch(poll(), 'نمای')).toBe(true)
      expect(matchesPollSearch(poll(), 'بازسازی')).toBe(true)
      expect(matchesPollSearch(poll(), 'خاکستری')).toBe(true)
      expect(matchesPollSearch(poll(), 'آسانسور')).toBe(false)
    })

    it('understands a typed status, with or without the zero-width joiner', () => {
      const draft = poll({ status: PollApiStatus.DRAFT, title: 'بدون واژه وضعیت' })
      expect(matchesPollSearch(draft, 'پیش‌نویس')).toBe(true)
      expect(matchesPollSearch(draft, 'پیش نویس')).toBe(true)
      expect(matchesPollSearch(draft, 'بسته‌شده')).toBe(false)
    })
  })

  describe('filterPolls', () => {
    const polls = [
      poll({ id: 1, status: PollApiStatus.DRAFT, title: 'رنگ نما' }),
      poll({ id: 2, status: PollApiStatus.ACTIVE, title: 'ساعت تخلیه زباله' }),
      poll({ id: 3, status: PollApiStatus.CLOSED, title: 'رنگ لابی' }),
    ]

    it('returns everything when nothing is narrowed', () => {
      expect(filterPolls(polls)).toHaveLength(3)
      expect(filterPolls(polls, { status: 'all', search: '' })).toHaveLength(3)
    })

    it('narrows by status', () => {
      expect(filterPolls(polls, { status: PollStatus.DRAFT }).map((item) => item.id)).toEqual([1])
    })

    it('combines the status filter with the search term', () => {
      expect(
        filterPolls(polls, { status: PollStatus.CLOSED, search: 'رنگ' }).map((item) => item.id),
      ).toEqual([3])
    })
  })

  describe('local date and time', () => {
    it('round-trips a deadline through the form fields', () => {
      const iso = combineLocalDateTime('2026-09-01', '18:30')
      expect(splitLocalDateTime(iso)).toEqual({ date: '2026-09-01', time: '18:30' })
    })

    it('defaults to the end of the day when no time is given', () => {
      expect(splitLocalDateTime(combineLocalDateTime('2026-09-01')).time).toBe('23:59')
    })

    it('rejects a malformed day or clock time', () => {
      expect(combineLocalDateTime('', '18:30')).toBe('')
      expect(combineLocalDateTime('01/09/2026', '18:30')).toBe('')
      expect(combineLocalDateTime('2026-09-01', '25:00')).toBe('')
    })

    it('gives back empty fields for a missing timestamp', () => {
      expect(splitLocalDateTime(null)).toEqual({ date: '', time: '' })
      expect(splitLocalDateTime('not-a-date')).toEqual({ date: '', time: '' })
    })
  })
})
