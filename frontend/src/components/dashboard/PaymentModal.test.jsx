import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { residentChargeApi } from '../../lib/billingApi'
import { PaymentModal } from './PaymentModal'

vi.mock('../../lib/billingApi', () => ({
  residentChargeApi: {
    pay: vi.fn(),
  },
}))

const charges = [
  { id: 1, title: 'شارژ شهریور', amount: '500000.00' },
  { id: 2, title: 'شارژ مهر', amount: '250000.00' },
]

function renderModal(props = {}) {
  const onPaid = vi.fn()
  const onClose = vi.fn()
  const onFailed = vi.fn()

  render(
    <ToastProvider>
      <PaymentModal
        open
        charges={charges}
        unitDebt="900000.00"
        onClose={onClose}
        onPaid={onPaid}
        onFailed={onFailed}
        {...props}
      />
    </ToastProvider>,
  )

  return { onPaid, onClose, onFailed }
}

describe('PaymentModal', () => {
  beforeEach(() => {
    residentChargeApi.pay.mockReset()
  })

  it('renders nothing while closed', () => {
    renderModal({ open: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing when no charges are selected', () => {
    renderModal({ charges: [] })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('itemizes the selected charges with the total and the remaining debt', () => {
    renderModal()

    expect(screen.getByRole('dialog', { name: 'پرداخت شارژ' })).toBeInTheDocument()
    expect(screen.getByText('2 صورت‌حساب برای پرداخت انتخاب شده است')).toBeInTheDocument()
    expect(screen.getByText('شارژ شهریور')).toBeInTheDocument()
    expect(screen.getByText('شارژ مهر')).toBeInTheDocument()
    expect(screen.getByText('750,000 تومان')).toBeInTheDocument()
    expect(screen.getByText('150,000 تومان')).toBeInTheDocument()
    expect(screen.getByText(/این درگاه پرداخت شبیه‌سازی‌شده است/)).toBeInTheDocument()
  })

  it('posts the selected charge ids and reports them back on success', async () => {
    const user = userEvent.setup()
    residentChargeApi.pay.mockResolvedValue({ message: 'پرداخت با موفقیت انجام شد.' })
    const { onPaid, onClose } = renderModal()

    await user.click(screen.getByRole('button', { name: /تأیید و پرداخت/ }))

    expect(residentChargeApi.pay).toHaveBeenCalledWith([1, 2])
    expect(onPaid).toHaveBeenCalledWith([1, 2])
    expect(onClose).toHaveBeenCalled()
    expect(await screen.findByText('پرداخت با موفقیت انجام شد.')).toBeInTheDocument()
  })

  it('shows the server message and asks the caller to resync when payment fails', async () => {
    const user = userEvent.setup()
    residentChargeApi.pay.mockRejectedValue(
      Object.assign(new Error('برخی از شارژهای انتخاب‌شده قبلاً پرداخت شده‌اند.'), { status: 400 }),
    )
    const { onPaid, onClose, onFailed } = renderModal()

    await user.click(screen.getByRole('button', { name: /تأیید و پرداخت/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'برخی از شارژهای انتخاب‌شده قبلاً پرداخت شده‌اند.',
    )
    expect(onPaid).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(onFailed).toHaveBeenCalled()
  })

  it('locks the buttons while the payment is in flight', async () => {
    const user = userEvent.setup()
    residentChargeApi.pay.mockReturnValue(new Promise(() => {}))
    renderModal()

    await user.click(screen.getByRole('button', { name: /تأیید و پرداخت/ }))

    expect(screen.getByRole('button', { name: /در حال پرداخت/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'انصراف' })).toBeDisabled()
  })

  it('closes without paying when the resident cancels', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(screen.getByRole('button', { name: 'انصراف' }))

    expect(onClose).toHaveBeenCalled()
    expect(residentChargeApi.pay).not.toHaveBeenCalled()
  })
})
