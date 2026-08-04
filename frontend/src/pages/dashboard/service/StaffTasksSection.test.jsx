import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/ToastProvider'
import { useStaffServiceRequests } from '../../../hooks/useStaffServiceRequests'
import { staffServiceRequestApi } from '../../../lib/serviceRequestApi'
import { StaffTasksSection } from './StaffTasksSection'

vi.mock('../../../hooks/useStaffServiceRequests', () => ({
  useStaffServiceRequests: vi.fn(),
}))

vi.mock('../../../lib/serviceRequestApi', () => ({
  staffServiceRequestApi: {
    submitWorkReport: vi.fn(),
    clearWorkReport: vi.fn(),
  },
}))

const user = { id: 12, full_name: 'متین محمودی', phone: '09120000001', role: 'service_staff' }

const assignedTask = {
  id: 1,
  title: 'تعمیر شیر آب',
  description: 'شیر آشپزخانه چکه می‌کند.',
  status: 'Assigned',
  unit_number: '102',
  resident: { id: 5, full_name: 'سارا احمدی', phone: '09121111111' },
  work_report: null,
}

const completedTask = {
  id: 2,
  title: 'تعویض لامپ راهرو',
  description: 'لامپ طبقه دوم سوخته است.',
  status: 'Completed',
  unit_number: '201',
  resident: { id: 6, full_name: 'رضا کریمی', phone: '09122222222' },
  work_report: 'لامپ تعویض شد و تست شد.',
}

function mockHook(overrides = {}) {
  const updateRequest = vi.fn()
  useStaffServiceRequests.mockReturnValue({
    requests: [],
    loading: false,
    refreshing: false,
    error: '',
    refresh: vi.fn(),
    updateRequest,
    ...overrides,
  })
  return { updateRequest }
}

function renderSection() {
  render(
    <ToastProvider>
      <StaffTasksSection user={user} />
    </ToastProvider>,
  )
}

describe('StaffTasksSection', () => {
  beforeEach(() => {
    useStaffServiceRequests.mockReset()
    staffServiceRequestApi.submitWorkReport.mockReset()
  })

  it('renders the key details of an assigned task', () => {
    mockHook({ requests: [assignedTask] })
    renderSection()

    expect(screen.getByRole('heading', { name: 'تعمیر شیر آب' })).toBeInTheDocument()
    expect(screen.getByText('شیر آشپزخانه چکه می‌کند.')).toBeInTheDocument()
    expect(screen.getByText('واحد 102')).toBeInTheDocument()
    expect(screen.getByText('سارا احمدی')).toBeInTheDocument()
    expect(screen.getByText('09121111111')).toBeInTheDocument()
    expect(screen.getByText('ارجاع‌شده')).toBeInTheDocument()
  })

  it('falls back gracefully when the resident has no registered unit', () => {
    mockHook({ requests: [{ ...assignedTask, unit_number: null }] })
    renderSection()

    expect(screen.getByText('واحد نامشخص')).toBeInTheDocument()
  })

  it('shows the work report on a completed task', () => {
    mockHook({ requests: [completedTask] })
    renderSection()

    // The label also titles a summary card, so assert the badge inside the card.
    expect(within(screen.getByRole('article')).getByText('تکمیل‌شده')).toBeInTheDocument()
    expect(screen.getByText('گزارش انجام کار')).toBeInTheDocument()
    expect(screen.getByText('لامپ تعویض شد و تست شد.')).toBeInTheDocument()
  })

  it('counts open and completed tasks separately', () => {
    mockHook({ requests: [assignedTask, completedTask] })
    renderSection()

    const cardValue = (title) =>
      screen
        .getAllByText(title)
        .find((node) => node.tagName === 'P')
        .parentElement.querySelector('h3').textContent

    expect(cardValue('کل وظایف')).toBe('2')
    expect(cardValue('در حال انجام')).toBe('1')
    expect(cardValue('تکمیل‌شده')).toBe('1')
  })

  it('shows an empty state when nothing is assigned', () => {
    mockHook({ requests: [] })
    renderSection()

    expect(screen.getByText('هنوز وظیفه‌ای به شما ارجاع نشده است')).toBeInTheDocument()
  })

  it('offers submit on open tasks and edit on completed ones', () => {
    mockHook({ requests: [assignedTask, completedTask] })
    renderSection()

    const articles = screen.getAllByRole('article')
    expect(within(articles[0]).getByRole('button', { name: /ثبت گزارش کار/ })).toBeInTheDocument()
    expect(within(articles[0]).queryByRole('button', { name: /ویرایش گزارش/ })).not.toBeInTheDocument()
    expect(within(articles[1]).getByRole('button', { name: /ویرایش گزارش/ })).toBeInTheDocument()
    expect(within(articles[1]).queryByRole('button', { name: /ثبت گزارش کار/ })).not.toBeInTheDocument()
  })

  it('opens the editor prefilled with the existing report', async () => {
    const user = userEvent.setup()
    mockHook({ requests: [completedTask] })
    renderSection()

    await user.click(screen.getByRole('button', { name: /ویرایش گزارش/ }))

    expect(screen.getByRole('heading', { name: 'ویرایش گزارش کار' })).toBeInTheDocument()
    expect(screen.getByLabelText('شرح کار انجام‌شده')).toHaveValue(completedTask.work_report)
  })

  it('submits a report and pushes the completed task straight into local state', async () => {
    const user = userEvent.setup()
    const completed = { ...assignedTask, status: 'Completed', work_report: 'شیر تعویض شد.' }
    staffServiceRequestApi.submitWorkReport.mockResolvedValue(completed)
    const { updateRequest } = mockHook({ requests: [assignedTask] })
    renderSection()

    await user.click(screen.getByRole('button', { name: /ثبت گزارش کار/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.type(screen.getByLabelText('شرح کار انجام‌شده'), 'شیر تعویض شد.')
    await user.click(screen.getByRole('button', { name: /ثبت و تکمیل وظیفه/ }))

    await waitFor(() => expect(updateRequest).toHaveBeenCalledWith(completed))
    expect(staffServiceRequestApi.submitWorkReport).toHaveBeenCalledWith(assignedTask.id, 'شیر تعویض شد.')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('surfaces a server error with a retry action', () => {
    mockHook({ error: 'ارتباط با سرور برقرار نشد.' })
    renderSection()

    expect(screen.getByText('ارتباط با سرور برقرار نشد.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تلاش مجدد' })).toBeInTheDocument()
  })
})
