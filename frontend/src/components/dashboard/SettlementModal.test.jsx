import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { managerServiceRequestApi } from '../../lib/serviceRequestApi'
import { SettlementModal } from './SettlementModal'

vi.mock('../../lib/serviceRequestApi', () => ({
  managerServiceRequestApi: {
    settleRequest: vi.fn(),
  },
}))

const serviceRequest = {
  id: 12,
  title: 'نشتی آب',
  description: 'چکه می‌کند.',
  status: 'Completed',
  resident: { id: 5, full_name: 'سارا احمدی', phone: '09121111111' },
  assigned_staff: { id: 9, full_name: 'متین محمودی', phone: '09120000009' },
  work_report: 'انجام شد.',
  cost: null,
  payment_method: null,
  is_settled: false,
}

function renderModal(overrides = {}) {
  const onClose = vi.fn()
  const onSettled = vi.fn()
  render(
    <ToastProvider>
      <SettlementModal
        open
        serviceRequest={serviceRequest}
        onClose={onClose}
        onSettled={onSettled}
        {...overrides}
      />
    </ToastProvider>,
  )
  return { onClose, onSettled }
}

describe('SettlementModal', () => {
  beforeEach(() => {
    managerServiceRequestApi.settleRequest.mockReset()
  })

  it('offers a cost input and all three payment methods', () => {
    renderModal()

    expect(screen.getByText('نشتی آب')).toBeInTheDocument()
    expect(screen.getByLabelText('مبلغ کل هزینه (تومان)')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /تقسیم مساوی بین واحدها/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /بر عهده درخواست‌دهنده/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /از صندوق ساختمان/ })).toBeInTheDocument()
  })

  it('defaults to the equal split method', () => {
    renderModal()

    expect(screen.getByRole('radio', { name: /تقسیم مساوی بین واحدها/ })).toBeChecked()
  })

  it('rejects an empty cost without calling the API', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: /ثبت تسویه/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('مبلغ هزینه الزامی است.')
    expect(managerServiceRequestApi.settleRequest).not.toHaveBeenCalled()
  })

  it('rejects a negative cost without calling the API', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('مبلغ کل هزینه (تومان)'), '-50')
    await user.click(screen.getByRole('button', { name: /ثبت تسویه/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('مبلغ هزینه باید بزرگ‌تر از صفر باشد.')
    expect(managerServiceRequestApi.settleRequest).not.toHaveBeenCalled()
  })

  it('rejects a zero cost without calling the API', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('مبلغ کل هزینه (تومان)'), '0')
    await user.click(screen.getByRole('button', { name: /ثبت تسویه/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('مبلغ هزینه باید بزرگ‌تر از صفر باشد.')
    expect(managerServiceRequestApi.settleRequest).not.toHaveBeenCalled()
  })

  it('submits the chosen cost and method, and hands back the settled request', async () => {
    const user = userEvent.setup()
    const settled = {
      ...serviceRequest,
      cost: '250000.00',
      payment_method: 'REQUESTER_ONLY',
      is_settled: true,
    }
    managerServiceRequestApi.settleRequest.mockResolvedValue({
      message: 'تسویه هزینه با موفقیت انجام شد.',
      request: settled,
    })
    const { onSettled, onClose } = renderModal()

    await user.type(screen.getByLabelText('مبلغ کل هزینه (تومان)'), '250000')
    await user.click(screen.getByRole('radio', { name: /بر عهده درخواست‌دهنده/ }))
    await user.click(screen.getByRole('button', { name: /ثبت تسویه/ }))

    await waitFor(() =>
      expect(managerServiceRequestApi.settleRequest).toHaveBeenCalledWith(12, {
        cost: '250000.00',
        payment_method: 'REQUESTER_ONLY',
      }),
    )
    expect(onSettled).toHaveBeenCalledWith(settled)
    expect(onClose).toHaveBeenCalled()
    expect(await screen.findByText('تسویه هزینه با موفقیت انجام شد.')).toBeInTheDocument()
  })

  it('reports an insufficient building wallet and keeps the request unsettled', async () => {
    const user = userEvent.setup()
    managerServiceRequestApi.settleRequest.mockRejectedValue(
      new Error('موجودی صندوق ساختمان برای پرداخت این هزینه کافی نیست.'),
    )
    const { onSettled, onClose } = renderModal()

    await user.type(screen.getByLabelText('مبلغ کل هزینه (تومان)'), '900000')
    await user.click(screen.getByRole('radio', { name: /از صندوق ساختمان/ }))
    await user.click(screen.getByRole('button', { name: /ثبت تسویه/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'موجودی صندوق ساختمان برای پرداخت این هزینه کافی نیست.',
    )
    expect(onSettled).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders nothing without a selected request', () => {
    const { container } = render(
      <ToastProvider>
        <SettlementModal open serviceRequest={null} onClose={vi.fn()} onSettled={vi.fn()} />
      </ToastProvider>,
    )

    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})
