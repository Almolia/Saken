import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentReceiptModal } from './PaymentReceiptModal'

const paidCharge = {
  id: 42,
  title: 'شارژ شهریور',
  description: 'نظافت مشاعات',
  amount: '500000.00',
  due_date: '2026-09-20',
  status: 'Paid',
  paid_at: '2026-08-08T18:30:00+03:30',
}

function renderReceipt(props = {}) {
  return render(
    <PaymentReceiptModal open charge={paidCharge} onClose={vi.fn()} {...props} />,
  )
}

describe('PaymentReceiptModal', () => {
  it('renders nothing until a payment is selected', () => {
    const { container } = render(<PaymentReceiptModal open charge={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the reference number, the settled bill and the amount paid', () => {
    renderReceipt()

    const dialog = within(screen.getByRole('dialog', { name: 'رسید پرداخت' }))
    expect(dialog.getByText('شماره رسید 42')).toBeInTheDocument()
    expect(dialog.getByText('#42')).toBeInTheDocument()
    expect(dialog.getByText('شارژ شهریور')).toBeInTheDocument()
    expect(dialog.getByText('نظافت مشاعات')).toBeInTheDocument()
    expect(dialog.getByText('500,000 تومان')).toBeInTheDocument()
    expect(dialog.getByText('پرداخت‌شده')).toBeInTheDocument()
  })

  it('says so rather than showing a blank when the record has no payment time', () => {
    renderReceipt({ charge: { ...paidCharge, paid_at: null } })

    expect(screen.getByText('ثبت نشده است')).toBeInTheDocument()
  })

  it('omits the optional description and due date when the charge has neither', () => {
    renderReceipt({ charge: { ...paidCharge, description: '   ', due_date: null } })

    expect(screen.queryByText('توضیحات')).not.toBeInTheDocument()
    expect(screen.queryByText('مهلت پرداخت صورت‌حساب')).not.toBeInTheDocument()
  })

  it('prints only the receipt, not the dashboard around it', async () => {
    const user = userEvent.setup()
    const print = vi.fn()
    vi.stubGlobal('print', print)
    renderReceipt()

    // The print stylesheet keys off this attribute to blank everything else.
    expect(document.querySelector('[data-print-area]')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /چاپ یا ذخیره رسید/ }))
    expect(print).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('closes on the close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderReceipt({ onClose })

    await user.click(screen.getByRole('button', { name: 'بستن رسید' }))
    expect(onClose).toHaveBeenCalled()
  })
})
