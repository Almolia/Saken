import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PendingChargesList } from './PendingChargesList'

const sampleCharge = {
  id: 1,
  title: 'شارژ شهریور',
  description: 'نظافت مشاعات',
  amount: '500000.00',
  due_date: '2026-09-20',
  status: 'Pending',
}

const secondCharge = {
  id: 2,
  title: 'شارژ مهر',
  description: '',
  amount: '250000.00',
  due_date: '2026-10-20',
  status: 'Pending',
}

function renderList(props = {}) {
  return render(
    <PendingChargesList
      charges={[sampleCharge]}
      loading={false}
      error=""
      onRetry={vi.fn()}
      {...props}
    />,
  )
}

describe('PendingChargesList', () => {
  it('shows the loading skeletons while loading', () => {
    renderList({ charges: [], loading: true })
    expect(screen.getByRole('status', { name: 'در حال بارگذاری شارژها' })).toBeInTheDocument()
  })

  it('renders the friendly empty state when there are no charges', () => {
    renderList({ charges: [] })
    expect(screen.getByText(/شارژ پرداخت‌نشده‌ای ندارید/)).toBeInTheDocument()
  })

  it('renders each charge with its title, description, amount and due date', () => {
    renderList()

    expect(screen.getByText('شارژ شهریور')).toBeInTheDocument()
    expect(screen.getByText('نظافت مشاعات')).toBeInTheDocument()
    expect(screen.getByText('500,000 تومان')).toBeInTheDocument()
    expect(screen.getByText('در انتظار پرداخت')).toBeInTheDocument()
  })

  it('shows the error UI and a retry button on failure', () => {
    renderList({ charges: [], error: 'خطایی رخ داد' })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('دریافت شارژها ناموفق بود')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /تلاش مجدد/ })).toBeInTheDocument()
  })

  it('marks a charge whose due date has passed as overdue', () => {
    renderList({ charges: [{ ...sampleCharge, due_date: '2020-01-01' }] })

    expect(screen.getByText('مهلت گذشته')).toBeInTheDocument()
    expect(screen.queryByText('در انتظار پرداخت')).not.toBeInTheDocument()
  })

  it('renders a checkbox per charge and reports toggles by charge id', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderList({ charges: [sampleCharge, secondCharge], onToggle })

    await user.click(screen.getByRole('checkbox', { name: 'انتخاب شارژ مهر' }))

    expect(onToggle).toHaveBeenCalledWith(2)
  })

  it('reflects the current selection in the checkboxes', () => {
    renderList({ charges: [sampleCharge, secondCharge], selectedIds: [2] })

    expect(screen.getByRole('checkbox', { name: 'انتخاب شارژ شهریور' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'انتخاب شارژ مهر' })).toBeChecked()
  })

  it('exposes a select-all checkbox that reports back', async () => {
    const user = userEvent.setup()
    const onToggleAll = vi.fn()
    renderList({ charges: [sampleCharge, secondCharge], onToggleAll })

    await user.click(screen.getByRole('checkbox', { name: 'انتخاب همه' }))

    expect(onToggleAll).toHaveBeenCalled()
  })

  it('disables the pay button while nothing is selected', () => {
    renderList({ charges: [sampleCharge, secondCharge] })

    expect(screen.getByRole('button', { name: /پرداخت انتخاب‌شده‌ها/ })).toBeDisabled()
    expect(screen.getByText('برای پرداخت، صورت‌حساب‌های خود را انتخاب کنید')).toBeInTheDocument()
  })

  it('enables the pay button and shows the selected total once a charge is ticked', async () => {
    const user = userEvent.setup()
    const onPay = vi.fn()
    renderList({
      charges: [sampleCharge, secondCharge],
      selectedIds: [1, 2],
      totalSelected: 750000,
      unitDebt: '900000.00',
      onPay,
    })

    expect(screen.getByText('2 صورت‌حساب انتخاب شده است')).toBeInTheDocument()
    expect(screen.getByText('750,000 تومان')).toBeInTheDocument()
    expect(screen.getByText(/بدهی باقی‌مانده پس از پرداخت: 150,000 تومان/)).toBeInTheDocument()

    const payButton = screen.getByRole('button', { name: /پرداخت انتخاب‌شده‌ها/ })
    expect(payButton).toBeEnabled()

    await user.click(payButton)
    expect(onPay).toHaveBeenCalled()
  })

  it('hides the selection bar while there are no charges to pay', () => {
    renderList({ charges: [] })

    expect(screen.queryByRole('button', { name: /پرداخت انتخاب‌شده‌ها/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'انتخاب همه' })).not.toBeInTheDocument()
  })
})
