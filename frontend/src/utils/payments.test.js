import { describe, expect, it } from 'vitest'
import {
  PaymentSort,
  paymentTimestamp,
  searchPayments,
  sortPayments,
  summarizePayments,
  toPaymentHistoryCsv,
} from './payments'

const august = {
  id: 1,
  title: 'شارژ مرداد',
  description: 'نظافت مشاعات',
  amount: '500000.00',
  paid_at: '2026-08-01T10:00:00Z',
}
const september = {
  id: 2,
  title: 'شارژ شهریور',
  description: '',
  amount: '250000.00',
  paid_at: '2026-09-01T10:00:00Z',
}
const undated = { id: 3, title: 'شارژ قدیمی', description: '', amount: '900000.00', paid_at: null }

describe('paymentTimestamp', () => {
  it('reads the settlement time in milliseconds', () => {
    expect(paymentTimestamp(august)).toBe(Date.parse('2026-08-01T10:00:00Z'))
  })

  it('returns null for a record with no payment date', () => {
    expect(paymentTimestamp(undated)).toBeNull()
    expect(paymentTimestamp({ paid_at: 'not-a-date' })).toBeNull()
  })
})

describe('sortPayments', () => {
  it('puts the most recent payment first by default', () => {
    expect(sortPayments([august, september]).map((c) => c.id)).toEqual([2, 1])
  })

  it('does not mutate the array it was given', () => {
    const charges = [august, september]
    sortPayments(charges)
    expect(charges.map((c) => c.id)).toEqual([1, 2])
  })

  it('reverses to oldest-first on request', () => {
    expect(sortPayments([september, august], PaymentSort.OLDEST).map((c) => c.id)).toEqual([1, 2])
  })

  it('keeps undated records last in both directions', () => {
    expect(sortPayments([undated, august, september]).map((c) => c.id)).toEqual([2, 1, 3])
    expect(
      sortPayments([undated, august, september], PaymentSort.OLDEST).map((c) => c.id),
    ).toEqual([1, 2, 3])
  })

  it('breaks a shared timestamp by id so the order never shuffles', () => {
    const twin = { ...september, id: 9 }
    expect(sortPayments([september, twin]).map((c) => c.id)).toEqual([9, 2])
  })

  it('sorts by amount when asked, highest and lowest', () => {
    const charges = [august, september, undated]
    expect(sortPayments(charges, PaymentSort.HIGHEST).map((c) => c.id)).toEqual([3, 1, 2])
    expect(sortPayments(charges, PaymentSort.LOWEST).map((c) => c.id)).toEqual([2, 1, 3])
  })

  it('survives a missing or unknown input', () => {
    expect(sortPayments(undefined)).toEqual([])
    expect(sortPayments([august], 'nonsense')).toEqual([august])
  })
})

describe('searchPayments', () => {
  it('returns everything for a blank term', () => {
    expect(searchPayments([august, september], '   ')).toHaveLength(2)
  })

  it('matches on the settled charge title', () => {
    expect(searchPayments([august, september], 'شهریور').map((c) => c.id)).toEqual([2])
  })

  it('matches on the description and on the amount', () => {
    expect(searchPayments([august, september], 'نظافت').map((c) => c.id)).toEqual([1])
    expect(searchPayments([august, september], '250000').map((c) => c.id)).toEqual([2])
  })

  it('returns nothing when no bill matches', () => {
    expect(searchPayments([august, september], 'اسفند')).toEqual([])
  })
})

describe('summarizePayments', () => {
  it('counts the records and reports the latest settlement', () => {
    expect(summarizePayments([august, september])).toEqual({
      count: 2,
      latestPaidAt: new Date('2026-09-01T10:00:00Z').toISOString(),
      undatedCount: 0,
    })
  })

  it('counts undated records separately and leaves the latest date empty', () => {
    expect(summarizePayments([undated])).toEqual({
      count: 1,
      latestPaidAt: null,
      undatedCount: 1,
    })
  })

  it('handles an empty history', () => {
    expect(summarizePayments([])).toEqual({ count: 0, latestPaidAt: null, undatedCount: 0 })
  })
})

describe('toPaymentHistoryCsv', () => {
  it('writes a BOM, a header row and one newest-first row per payment', () => {
    const csv = toPaymentHistoryCsv([august, september])
    const lines = csv.split('\n')

    expect(csv.startsWith('﻿')).toBe(true)
    expect(lines[0]).toBe('﻿شناسه,عنوان,توضیحات,مبلغ (تومان),تاریخ پرداخت')
    expect(lines[1]).toContain('شارژ شهریور')
    expect(lines[2]).toContain('شارژ مرداد')
  })

  it('labels a record with no payment date instead of leaving it blank', () => {
    expect(toPaymentHistoryCsv([undated])).toContain('ثبت نشده')
  })

  it('quotes a title that contains a comma', () => {
    expect(toPaymentHistoryCsv([{ ...august, title: 'شارژ, مرداد' }])).toContain('"شارژ, مرداد"')
  })
})
