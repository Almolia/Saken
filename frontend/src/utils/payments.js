import { formatDate } from './helpers'

// Ordering options for the resident's payment history. The backend already
// serves the list newest-first, so these are applied on top of an order that
// is correct by default; re-sorting in the browser keeps the guarantee no
// matter which shape the payload arrives in and powers the sort control.
export const PaymentSort = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  HIGHEST: 'highest',
  LOWEST: 'lowest',
}

export const paymentSortOptions = [
  { value: PaymentSort.NEWEST, label: 'جدیدترین پرداخت' },
  { value: PaymentSort.OLDEST, label: 'قدیمی‌ترین پرداخت' },
  { value: PaymentSort.HIGHEST, label: 'بیشترین مبلغ' },
  { value: PaymentSort.LOWEST, label: 'کمترین مبلغ' },
]

// Milliseconds of the settlement, or null for a charge settled before the
// backend recorded payment times.
export function paymentTimestamp(charge) {
  if (!charge?.paid_at) return null
  const time = new Date(charge.paid_at).getTime()
  return Number.isNaN(time) ? null : time
}

export function paymentAmount(charge) {
  const value = Number.parseFloat(charge?.amount)
  return Number.isFinite(value) ? value : 0
}

// Undated records carry no chronological information, so they sit at the end
// in *both* directions rather than masquerading as the oldest payments. This
// mirrors the backend's `nulls_last` ordering.
function byPaymentDate(direction) {
  return (a, b) => {
    const left = paymentTimestamp(a)
    const right = paymentTimestamp(b)

    if (left === null && right === null) return (b.id ?? 0) - (a.id ?? 0)
    if (left === null) return 1
    if (right === null) return -1
    if (left !== right) return direction * (right - left)

    // Two charges settled in the same transaction share a timestamp; the id
    // breaks the tie so the order never shuffles between renders.
    return direction * ((b.id ?? 0) - (a.id ?? 0))
  }
}

function byAmount(direction) {
  return (a, b) => {
    const difference = paymentAmount(b) - paymentAmount(a)
    if (difference !== 0) return direction * difference
    return byPaymentDate(1)(a, b)
  }
}

const comparators = {
  [PaymentSort.NEWEST]: byPaymentDate(1),
  [PaymentSort.OLDEST]: byPaymentDate(-1),
  [PaymentSort.HIGHEST]: byAmount(1),
  [PaymentSort.LOWEST]: byAmount(-1),
}

export function sortPayments(charges, order = PaymentSort.NEWEST) {
  if (!Array.isArray(charges)) return []
  const comparator = comparators[order] || comparators[PaymentSort.NEWEST]
  // Copied first: the caller's array is hook state and must not be mutated.
  return [...charges].sort(comparator)
}

// A history that spans years is scrolled, not read, so the resident needs to
// be able to pick a single bill out of it. Amount is searchable too because
// "500000" is a natural thing to type when hunting for one payment.
export function searchPayments(charges, term) {
  if (!Array.isArray(charges)) return []

  const needle = String(term || '').trim().toLowerCase()
  if (!needle) return charges

  return charges.filter((charge) => {
    const haystack = [charge?.title, charge?.description, charge?.amount]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(needle)
  })
}

export function summarizePayments(charges) {
  const list = Array.isArray(charges) ? charges : []
  const timestamps = list.map(paymentTimestamp).filter((value) => value !== null)

  return {
    count: list.length,
    // Null while every record predates the paid_at column, which the UI
    // reports as "not recorded" rather than as "no payments".
    latestPaidAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null,
    undatedCount: list.length - timestamps.length,
  }
}

// Excel opens a bare UTF-8 file as mojibake unless it is led by a byte order
// mark, and Persian headers are the whole point of the export.
const CSV_BOM = '﻿'

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** The resident's own copy of the record, as a spreadsheet-ready CSV string. */
export function toPaymentHistoryCsv(charges) {
  const rows = sortPayments(charges).map((charge) => [
    charge.id,
    charge.title,
    charge.description || '',
    charge.amount,
    charge.paid_at ? formatDate(charge.paid_at) : 'ثبت نشده',
  ])

  return (
    CSV_BOM +
    [['شناسه', 'عنوان', 'توضیحات', 'مبلغ (تومان)', 'تاریخ پرداخت'], ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\n')
  )
}
