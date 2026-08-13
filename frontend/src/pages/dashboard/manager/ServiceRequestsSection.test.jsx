import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/ToastProvider'
import { useManagerServiceRequests } from '../../../hooks/useManagerServiceRequests'
import { useServiceStaff } from '../../../hooks/useServiceStaff'
import { managerServiceRequestApi } from '../../../lib/serviceRequestApi'
import { ServiceRequestsSection } from './ServiceRequestsSection'

vi.mock('../../../hooks/useManagerServiceRequests', () => ({
  useManagerServiceRequests: vi.fn(),
}))

vi.mock('../../../hooks/useServiceStaff', () => ({
  useServiceStaff: vi.fn(),
}))

vi.mock('../../../lib/serviceRequestApi', () => ({
  managerServiceRequestApi: {
    assignStaff: vi.fn(),
    settleRequest: vi.fn(),
  },
}))

const resident = { id: 5, full_name: 'سارا احمدی', phone: '09121111111' }
const staffMember = { id: 9, full_name: 'متین محمودی', phone: '09120000009' }
const otherStaffMember = { id: 10, full_name: 'رضا کریمی', phone: '09120000010' }

const pendingRequest = {
  id: 1,
  title: 'نشتی آب',
  description: 'لوله حمام چکه می‌کند.',
  status: 'Pending',
  resident,
  assigned_staff: null,
  work_report: null,
}

const assignedRequest = {
  id: 2,
  title: 'تعمیر آسانسور',
  description: 'آسانسور در طبقه سوم متوقف می‌شود.',
  status: 'Assigned',
  resident,
  assigned_staff: staffMember,
  work_report: null,
}

const completedRequest = {
  id: 3,
  title: 'تعویض لامپ',
  description: 'لامپ راهرو سوخته است.',
  status: 'Completed',
  resident,
  assigned_staff: staffMember,
  work_report: 'لامپ تعویض و روشنایی بررسی شد.',
  cost: null,
  payment_method: null,
  is_settled: false,
}

const settledRequest = {
  ...completedRequest,
  id: 4,
  title: 'تعمیر پمپ آب',
  cost: '250000.00',
  payment_method: 'EQUAL_SPLIT',
  is_settled: true,
}

function renderSection(requests) {
  const updateRequest = vi.fn()
  useManagerServiceRequests.mockReturnValue({
    requests,
    loading: false,
    refreshing: false,
    error: '',
    refresh: vi.fn(),
    updateRequest,
  })
  useServiceStaff.mockReturnValue({
    staff: [staffMember, otherStaffMember],
    loading: false,
    error: '',
  })
  render(
    <ToastProvider>
      <ServiceRequestsSection />
    </ToastProvider>,
  )
  return { updateRequest }
}

describe('ServiceRequestsSection', () => {
  beforeEach(() => {
    useManagerServiceRequests.mockReset()
    useServiceStaff.mockReset()
    managerServiceRequestApi.assignStaff.mockReset()
    managerServiceRequestApi.settleRequest.mockReset()
  })

  describe('settlement', () => {
    it('offers settlement only on a completed request that is not settled yet', () => {
      renderSection([pendingRequest, assignedRequest, completedRequest, settledRequest])

      const articles = screen.getAllByRole('article')
      expect(within(articles[0]).queryByRole('button', { name: /تسویه هزینه/ })).not.toBeInTheDocument()
      expect(within(articles[1]).queryByRole('button', { name: /تسویه هزینه/ })).not.toBeInTheDocument()
      expect(within(articles[2]).getByRole('button', { name: /تسویه هزینه/ })).toBeInTheDocument()
      expect(within(articles[3]).queryByRole('button', { name: /تسویه هزینه/ })).not.toBeInTheDocument()
    })

    it('marks an already settled request with its cost and method', () => {
      renderSection([settledRequest])

      const card = screen.getByRole('article')
      expect(within(card).getByText('تسویه‌شده')).toBeInTheDocument()
      expect(within(card).getByText('250,000 تومان')).toBeInTheDocument()
      expect(within(card).getByText('تقسیم مساوی بین واحدها')).toBeInTheDocument()
    })

    it('opens the settlement form from the card', async () => {
      const user = userEvent.setup()
      renderSection([completedRequest])

      await user.click(screen.getByRole('button', { name: /تسویه هزینه/ }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByLabelText('مبلغ کل هزینه (تومان)')).toBeInTheDocument()
    })

    it('pushes the settled request straight into local state', async () => {
      const user = userEvent.setup()
      const settled = { ...completedRequest, cost: '120000.00', payment_method: 'REQUESTER_ONLY', is_settled: true }
      managerServiceRequestApi.settleRequest.mockResolvedValue({
        message: 'تسویه هزینه با موفقیت انجام شد.',
        request: settled,
      })
      const { updateRequest } = renderSection([completedRequest])

      await user.click(screen.getByRole('button', { name: /تسویه هزینه/ }))
      await user.type(screen.getByLabelText('مبلغ کل هزینه (تومان)'), '120000')
      await user.click(screen.getByRole('radio', { name: /بر عهده درخواست‌دهنده/ }))
      await user.click(screen.getByRole('button', { name: /ثبت تسویه/ }))

      await waitFor(() =>
        expect(managerServiceRequestApi.settleRequest).toHaveBeenCalledWith(3, {
          cost: '120000.00',
          payment_method: 'REQUESTER_ONLY',
        }),
      )
      expect(updateRequest).toHaveBeenCalledWith(settled)
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })
  })

  it('shows the work report of a completed request', () => {
    renderSection([completedRequest])

    expect(screen.getByText('گزارش انجام کار')).toBeInTheDocument()
    expect(screen.getByText('لامپ تعویض و روشنایی بررسی شد.')).toBeInTheDocument()
  })

  it('does not show a work report while the request is still open', () => {
    renderSection([pendingRequest, assignedRequest])

    expect(screen.queryByText('گزارش انجام کار')).not.toBeInTheDocument()
  })

  it('hides the report block when a completed request has an empty report', () => {
    renderSection([{ ...completedRequest, work_report: '   ' }])

    expect(screen.queryByText('گزارش انجام کار')).not.toBeInTheDocument()
  })

  it('renders a localized status badge per request', () => {
    renderSection([pendingRequest, assignedRequest, completedRequest])

    const articles = screen.getAllByRole('article')
    expect(within(articles[0]).getByText('در انتظار بررسی')).toBeInTheDocument()
    expect(within(articles[1]).getByText('ارجاع‌شده')).toBeInTheDocument()
    expect(within(articles[2]).getByText('تکمیل‌شده')).toBeInTheDocument()
  })

  it('offers the assign control on open requests but never on completed ones', () => {
    renderSection([pendingRequest, assignedRequest, completedRequest])

    const articles = screen.getAllByRole('article')
    expect(within(articles[0]).getByRole('button', { name: 'ارجاع' })).toBeInTheDocument()
    expect(within(articles[1]).getByRole('button', { name: 'تغییر مسئول' })).toBeInTheDocument()
    expect(within(articles[2]).queryByRole('button', { name: /ارجاع|تغییر مسئول/ })).not.toBeInTheDocument()
  })

  it('preselects the current owner of an assigned request', () => {
    renderSection([assignedRequest])

    expect(screen.getByRole('combobox', { name: 'مسئول درخواست تعمیر آسانسور' })).toHaveValue(
      String(staffMember.id),
    )
  })

  it('keeps the reassign button disabled until a different member is picked', async () => {
    const user = userEvent.setup()
    renderSection([assignedRequest])

    const reassignButton = screen.getByRole('button', { name: 'تغییر مسئول' })
    expect(reassignButton).toBeDisabled()

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'مسئول درخواست تعمیر آسانسور' }),
      String(otherStaffMember.id),
    )

    expect(reassignButton).toBeEnabled()
  })

  it('sends the newly chosen staff member and updates the list', async () => {
    const user = userEvent.setup()
    const reassigned = { ...assignedRequest, assigned_staff: otherStaffMember }
    managerServiceRequestApi.assignStaff.mockResolvedValue({
      message: 'مسئول درخواست با موفقیت تغییر کرد.',
      request: reassigned,
    })
    const { updateRequest } = renderSection([assignedRequest])

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'مسئول درخواست تعمیر آسانسور' }),
      String(otherStaffMember.id),
    )
    await user.click(screen.getByRole('button', { name: 'تغییر مسئول' }))

    await waitFor(() =>
      expect(managerServiceRequestApi.assignStaff).toHaveBeenCalledWith(assignedRequest.id, {
        assigned_staff_id: otherStaffMember.id,
      }),
    )
    expect(updateRequest).toHaveBeenCalledWith(reassigned)
    expect(await screen.findByText('مسئول درخواست با موفقیت تغییر کرد.')).toBeInTheDocument()
  })

  it('surfaces a failed reassignment without changing the list', async () => {
    const user = userEvent.setup()
    managerServiceRequestApi.assignStaff.mockRejectedValue(
      new Error('درخواست‌های تکمیل‌شده قابل ارجاع مجدد نیستند.'),
    )
    const { updateRequest } = renderSection([assignedRequest])

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'مسئول درخواست تعمیر آسانسور' }),
      String(otherStaffMember.id),
    )
    await user.click(screen.getByRole('button', { name: 'تغییر مسئول' }))

    // Reported both inline on the card and as a toast, so scope to the card.
    const card = screen.getByRole('article')
    expect(
      await within(card).findByText('درخواست‌های تکمیل‌شده قابل ارجاع مجدد نیستند.'),
    ).toBeInTheDocument()
    expect(updateRequest).not.toHaveBeenCalled()
  })
})
