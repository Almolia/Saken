import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PendingChargesList } from './PendingChargesList'

const sampleCharge = {
  id: 1,
  title: 'شارژ شهریور',
  description: 'نظافت مشاعات',
  amount: '500000.00',
  due_date: '2026-09-20',
  status: 'Pending',
}

describe('PendingChargesList', () => {
  it('shows the loading skeletons while loading', () => {
    render(<PendingChargesList charges={[]} loading error="" onRetry={vi.fn()} />)
    expect(screen.getByRole('status', { name: 'در حال بارگذاری شارژها' })).toBeInTheDocument()
  })

  it('renders the friendly empty state when there are no charges', () => {
    render(<PendingChargesList charges={[]} loading={false} error="" onRetry={vi.fn()} />)
    expect(screen.getByText(/شارژ پرداخت‌نشده‌ای ندارید/)).toBeInTheDocument()
  })

  it('renders each charge with its title, description, amount and due date', () => {
    render(
      <PendingChargesList
        charges={[sampleCharge]}
        loading={false}
        error=""
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('شارژ شهریور')).toBeInTheDocument()
    expect(screen.getByText('نظافت مشاعات')).toBeInTheDocument()
    expect(screen.getByText('500,000 تومان')).toBeInTheDocument()
    expect(screen.getByText('در انتظار پرداخت')).toBeInTheDocument()
  })

  it('shows the error UI and a retry button on failure', () => {
    render(
      <PendingChargesList
        charges={[]}
        loading={false}
        error="خطایی رخ داد"
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('دریافت شارژها ناموفق بود')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /تلاش مجدد/ })).toBeInTheDocument()
  })
})
