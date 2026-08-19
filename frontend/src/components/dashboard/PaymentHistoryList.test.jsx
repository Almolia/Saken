import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentHistoryList } from './PaymentHistoryList'

const paidCharge = {
  id: 1,
  title: 'شارژ شهریور',
  amount: '500000.00',
  status: 'Paid',
  paid_at: '2026-08-08T18:30:00+03:30',
}

const olderCharge = {
  id: 2,
  title: 'شارژ مرداد',
  amount: '900000.00',
  status: 'Paid',
  paid_at: '2026-07-08T18:30:00+03:30',
}

const rowTitles = () =>
  within(screen.getByRole('list'))
    .getAllByRole('heading')
    .map((heading) => heading.textContent)

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
  it('lists the most recent payment first', () => {
    renderHistory({ charges: [olderCharge, paidCharge], totalPaid: '1400000.00' })

    expect(rowTitles()).toEqual(['شارژ شهریور', 'شارژ مرداد'])
  })

  it('re-orders the list when the resident picks another ordering', async () => {
    const user = userEvent.setup()
    renderHistory({ charges: [paidCharge, olderCharge], totalPaid: '1400000.00' })

    const sort = screen.getByRole('combobox', { name: 'ترتیب نمایش تاریخچه پرداخت' })
    await user.selectOptions(sort, 'oldest')
    expect(rowTitles()).toEqual(['شارژ مرداد', 'شارژ شهریور'])

    await user.selectOptions(sort, 'highest')
    expect(rowTitles()).toEqual(['شارژ مرداد', 'شارژ شهریور'])

    await user.selectOptions(sort, 'lowest')
    expect(rowTitles()).toEqual(['شارژ شهریور', 'شارژ مرداد'])
  })

  it('narrows the list to the searched bill and reports how many are shown', async () => {
    const user = userEvent.setup()
    renderHistory({ charges: [paidCharge, olderCharge], totalPaid: '1400000.00' })

    await user.type(screen.getByRole('searchbox', { name: 'جستجو در تاریخچه پرداخت' }), 'مرداد')

    expect(rowTitles()).toEqual(['شارژ مرداد'])
    expect(screen.getByText('1 پرداخت از 2 پرداخت نمایش داده می‌شود.')).toBeInTheDocument()
  })

  it('separates "nothing matched the search" from "no payments yet"', async () => {
    const user = userEvent.setup()
    renderHistory({ charges: [paidCharge, olderCharge], totalPaid: '1400000.00' })

    await user.type(screen.getByRole('searchbox', { name: 'جستجو در تاریخچه پرداخت' }), 'اسفند')

    expect(screen.getByText('پرداختی مطابق «اسفند» پیدا نشد.')).toBeInTheDocument()
    expect(screen.queryByText(/هنوز پرداختی ثبت نشده است/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'نمایش همه پرداخت‌ها' }))
    expect(rowTitles()).toHaveLength(2)
  })

  it('summarizes the count and the date of the latest payment', () => {
    renderHistory({ charges: [paidCharge, olderCharge], totalPaid: '1400000.00' })

    expect(screen.getByText('2 صورت‌حساب')).toBeInTheDocument()
    expect(screen.getByText('آخرین پرداخت')).toBeInTheDocument()
  })

  it('opens the receipt for the payment whose button was pressed', async () => {
    const user = userEvent.setup()
    renderHistory({ charges: [paidCharge, olderCharge], totalPaid: '1400000.00' })

    await user.click(screen.getByRole('button', { name: 'مشاهده رسید شارژ مرداد' }))

    const receipt = within(await screen.findByRole('dialog', { name: 'رسید پرداخت' }))
    expect(receipt.getByText('شماره رسید 2')).toBeInTheDocument()
    expect(receipt.getByText('900,000 تومان')).toBeInTheDocument()
  })

  it('re-reads the history from the refresh button and dims the rows while it is in flight', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const { rerender } = renderHistory({ charges: [paidCharge], onRetry })

    await user.click(screen.getByRole('button', { name: /به‌روزرسانی/ }))
    expect(onRetry).toHaveBeenCalled()

    rerender(
      <PaymentHistoryList
        charges={[paidCharge]}
        totalPaid="500000.00"
        loading={false}
        refreshing
        error=""
        onRetry={onRetry}
      />,
    )

    // The settled rows stay on screen rather than collapsing into skeletons.
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('شارژ شهریور')).toBeInTheDocument()
  })

  it('hides the toolbar and the summary while there is nothing to show', () => {
    renderHistory({ charges: [], totalPaid: '0.00' })

    expect(screen.queryByRole('searchbox', { name: 'جستجو در تاریخچه پرداخت' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'ترتیب نمایش تاریخچه پرداخت' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /به‌روزرسانی/ })).not.toBeInTheDocument()
  })
})
