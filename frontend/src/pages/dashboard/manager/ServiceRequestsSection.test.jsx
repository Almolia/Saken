import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ToastProvider } from '../../../components/ToastProvider'
import { useManagerServiceRequests } from '../../../hooks/useManagerServiceRequests'
import { useServiceStaff } from '../../../hooks/useServiceStaff'
import { ServiceRequestsSection } from './ServiceRequestsSection'

vi.mock('../../../hooks/useManagerServiceRequests', () => ({
  useManagerServiceRequests: vi.fn(),
}))

vi.mock('../../../hooks/useServiceStaff', () => ({
  useServiceStaff: vi.fn(),
}))

const resident = { id: 5, full_name: 'سارا احمدی', phone: '09121111111' }
const staffMember = { id: 9, full_name: 'متین محمودی', phone: '09120000009' }

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
}

function mockHooks(requests) {
  useManagerServiceRequests.mockReturnValue({
    requests,
    loading: false,
    refreshing: false,
    error: '',
    refresh: vi.fn(),
    updateRequest: vi.fn(),
  })
  useServiceStaff.mockReturnValue({ staff: [staffMember], loading: false, error: '' })
}

function renderSection(requests) {
  mockHooks(requests)
  render(
    <ToastProvider>
      <ServiceRequestsSection />
    </ToastProvider>,
  )
}

describe('ServiceRequestsSection', () => {
  beforeEach(() => {
    useManagerServiceRequests.mockReset()
    useServiceStaff.mockReset()
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

  it('offers the assign control only on pending requests', () => {
    renderSection([pendingRequest, completedRequest])

    const articles = screen.getAllByRole('article')
    expect(within(articles[0]).getByRole('button', { name: 'ارجاع' })).toBeInTheDocument()
    expect(within(articles[1]).queryByRole('button', { name: 'ارجاع' })).not.toBeInTheDocument()
  })
})
