import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { PaymentHistoryList } from './PaymentHistoryList'

const paidCharge = {
  id: 1,
  title: 'شارژ شهریور',
  amount: '500000.00',
  status: 'Paid',
  paid_at: '2026-08-08T18:30:00+03:30',
}

function renderHistory(props = {}) {
  return render(
    <PaymentHistoryList
      charges={[paidCharge]}
      totalPaid="500000.00"
      loading={false}
      error=""
      onRetry={vi.fn()}
      {...props}
    />,
  )
}

describe('PaymentHistoryList', () => {
  it('shows the loading skeletons while loading', () => {
    renderHistory({ charges: [], loading: true })
    expect(screen.getByRole('status', { name: 'در حال بارگذاری تاریخچه پرداخت' })).toBeInTheDocument()
  })

  it('renders each settled charge with its amount and payment date', () => {
    renderHistory()

    // Scoped to the list: the header repeats the same figure as the total.
    const rows = within(screen.getByRole('list'))
    expect(rows.getByText('شارژ شهریور')).toBeInTheDocument()
    expect(rows.getByText('پرداخت‌شده')).toBeInTheDocument()
    expect(rows.getByText('500,000 تومان')).toBeInTheDocument()
    expect(rows.getByText(/تاریخ پرداخت:/)).toBeInTheDocument()
  })

  it('shows the total paid alongside the list', () => {
    renderHistory({
      charges: [paidCharge, { ...paidCharge, id: 2, amount: '250000.00' }],
      totalPaid: '750000.00',
    })

    expect(screen.getByText('مجموع پرداختی')).toBeInTheDocument()
    expect(screen.getByText('750,000 تومان')).toBeInTheDocument()
  })

  it('says so rather than showing a blank when the backend has no payment date', () => {
    renderHistory({ charges: [{ ...paidCharge, paid_at: null }] })

    expect(screen.getByText('تاریخ پرداخت ثبت نشده است')).toBeInTheDocument()
  })

  it('renders an empty state before the first payment', () => {
    renderHistory({ charges: [], totalPaid: '0.00' })

    expect(screen.getByText(/هنوز پرداختی ثبت نشده است/)).toBeInTheDocument()
    expect(screen.queryByText('مجموع پرداختی')).not.toBeInTheDocument()
  })

  it('shows the error UI and a retry button on failure', () => {
    renderHistory({ charges: [], error: 'خطایی رخ داد' })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('دریافت تاریخچه پرداخت ناموفق بود')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /تلاش مجدد/ })).toBeInTheDocument()
  })
})
