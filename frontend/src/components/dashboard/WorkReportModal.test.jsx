import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { staffServiceRequestApi } from '../../lib/serviceRequestApi'
import { WorkReportModal } from './WorkReportModal'

vi.mock('../../lib/serviceRequestApi', () => ({
  staffServiceRequestApi: {
    submitWorkReport: vi.fn(),
    clearWorkReport: vi.fn(),
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

const completedRequest = {
  ...serviceRequest,
  status: 'Completed',
  work_report: 'واشر شیر تعویض شد.',
}

describe('WorkReportModal', () => {
  beforeEach(() => {
    staffServiceRequestApi.submitWorkReport.mockReset()
    staffServiceRequestApi.clearWorkReport.mockReset()
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

  describe('editing an existing report', () => {
    it('prefills the current report and offers a remove action', () => {
      renderModal({ serviceRequest: completedRequest })

      expect(screen.getByRole('heading', { name: 'ویرایش گزارش کار' })).toBeInTheDocument()
      expect(screen.getByLabelText('شرح کار انجام‌شده')).toHaveValue('واشر شیر تعویض شد.')
      expect(screen.getByRole('button', { name: /ذخیره تغییرات/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /حذف گزارش/ })).toBeInTheDocument()
    })

    it('saves rewritten text without reopening the task', async () => {
      const user = userEvent.setup()
      const updated = { ...completedRequest, work_report: 'واشر و شیلنگ تعویض شد.' }
      staffServiceRequestApi.submitWorkReport.mockResolvedValue(updated)
      const { onSubmitted } = renderModal({ serviceRequest: completedRequest })

      const textarea = screen.getByLabelText('شرح کار انجام‌شده')
      await user.clear(textarea)
      await user.type(textarea, 'واشر و شیلنگ تعویض شد.')
      await user.click(screen.getByRole('button', { name: /ذخیره تغییرات/ }))

      await waitFor(() =>
        expect(staffServiceRequestApi.submitWorkReport).toHaveBeenCalledWith(7, 'واشر و شیلنگ تعویض شد.'),
      )
      expect(onSubmitted).toHaveBeenCalledWith(updated)
      expect(await screen.findByText('گزارش کار به‌روزرسانی شد.')).toBeInTheDocument()
    })

    it('asks for confirmation before removing the report', async () => {
      const user = userEvent.setup()
      renderModal({ serviceRequest: completedRequest })

      await user.click(screen.getByRole('button', { name: /حذف گزارش/ }))

      expect(staffServiceRequestApi.clearWorkReport).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /بله، حذف کن/ })).toBeInTheDocument()
    })

    it('removes the report once confirmed and reports the task as reopened', async () => {
      const user = userEvent.setup()
      const reopened = { ...completedRequest, status: 'Assigned', work_report: null }
      staffServiceRequestApi.clearWorkReport.mockResolvedValue(reopened)
      const { onSubmitted, onClose } = renderModal({ serviceRequest: completedRequest })

      await user.click(screen.getByRole('button', { name: /حذف گزارش/ }))
      await user.click(screen.getByRole('button', { name: /بله، حذف کن/ }))

      await waitFor(() => expect(staffServiceRequestApi.clearWorkReport).toHaveBeenCalledWith(7))
      expect(onSubmitted).toHaveBeenCalledWith(reopened)
      expect(onClose).toHaveBeenCalled()
      expect(await screen.findByText('گزارش کار حذف شد و وظیفه دوباره باز شد.')).toBeInTheDocument()
    })

    it('lets the user back out of the removal confirmation', async () => {
      const user = userEvent.setup()
      renderModal({ serviceRequest: completedRequest })

      await user.click(screen.getByRole('button', { name: /حذف گزارش/ }))
      await user.click(screen.getByRole('button', { name: 'بازگشت' }))

      expect(screen.getByRole('button', { name: /حذف گزارش/ })).toBeInTheDocument()
      expect(staffServiceRequestApi.clearWorkReport).not.toHaveBeenCalled()
    })

    it('does not offer removal while the report is still being written', () => {
      renderModal()

      expect(screen.queryByRole('button', { name: /حذف گزارش/ })).not.toBeInTheDocument()
    })
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
