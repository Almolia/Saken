import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { staffServiceRequestApi } from '../../lib/serviceRequestApi'
import { WorkReportModal } from './WorkReportModal'

vi.mock('../../lib/serviceRequestApi', () => ({
  staffServiceRequestApi: {
    submitWorkReport: vi.fn(),
  },
}))

const serviceRequest = {
  id: 7,
  title: 'تعمیر شیر آب',
  description: 'شیر آشپزخانه چکه می‌کند.',
  status: 'Assigned',
  unit_number: '102',
  resident: { id: 5, full_name: 'سارا احمدی', phone: '09121111111' },
  work_report: null,
}

function renderModal(overrides = {}) {
  const onClose = vi.fn()
  const onSubmitted = vi.fn()
  render(
    <ToastProvider>
      <WorkReportModal
        open
        serviceRequest={serviceRequest}
        onClose={onClose}
        onSubmitted={onSubmitted}
        {...overrides}
      />
    </ToastProvider>,
  )
  return { onClose, onSubmitted }
}

describe('WorkReportModal', () => {
  beforeEach(() => {
    staffServiceRequestApi.submitWorkReport.mockReset()
  })

  it('shows the task title it is reporting on', () => {
    renderModal()

    expect(screen.getByText('تعمیر شیر آب')).toBeInTheDocument()
    expect(screen.getByLabelText('شرح کار انجام‌شده')).toBeInTheDocument()
  })

  it('sends the trimmed report and hands the completed task back', async () => {
    const user = userEvent.setup()
    const completed = { ...serviceRequest, status: 'Completed', work_report: 'شیر تعویض شد.' }
    staffServiceRequestApi.submitWorkReport.mockResolvedValue(completed)
    const { onSubmitted, onClose } = renderModal()

    await user.type(screen.getByLabelText('شرح کار انجام‌شده'), '  شیر تعویض شد.  ')
    await user.click(screen.getByRole('button', { name: /ثبت و تکمیل وظیفه/ }))

    await waitFor(() => expect(staffServiceRequestApi.submitWorkReport).toHaveBeenCalledWith(7, 'شیر تعویض شد.'))
    expect(onSubmitted).toHaveBeenCalledWith(completed)
    expect(onClose).toHaveBeenCalled()
    expect(await screen.findByText('گزارش کار ثبت شد و وظیفه تکمیل شد.')).toBeInTheDocument()
  })

  it('refuses to submit an empty report', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: /ثبت و تکمیل وظیفه/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('برای تکمیل وظیفه، شرح کار انجام‌شده الزامی است.')
    expect(staffServiceRequestApi.submitWorkReport).not.toHaveBeenCalled()
  })

  it('reports a server failure and keeps the task open', async () => {
    const user = userEvent.setup()
    staffServiceRequestApi.submitWorkReport.mockRejectedValue(new Error('ارتباط با سرور برقرار نشد.'))
    const { onSubmitted, onClose } = renderModal()

    await user.type(screen.getByLabelText('شرح کار انجام‌شده'), 'انجام شد.')
    await user.click(screen.getByRole('button', { name: /ثبت و تکمیل وظیفه/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ارتباط با سرور برقرار نشد.')
    expect(onSubmitted).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders nothing without a selected task', () => {
    const { container } = render(
      <ToastProvider>
        <WorkReportModal open serviceRequest={null} onClose={vi.fn()} onSubmitted={vi.fn()} />
      </ToastProvider>,
    )

    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})
