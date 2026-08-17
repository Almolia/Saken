import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/ToastProvider'
import { useManagerServiceRequests } from '../../../hooks/useManagerServiceRequests'
import { useServiceStaff } from '../../../hooks/useServiceStaff'
import { managerServiceRequestApi } from '../../../lib/serviceRequestApi'
import { SortOrder, StatusFilter } from '../../../utils/serviceRequests'
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

const sampleSummary = { Pending: 4, Assigned: 2, Completed: 3 }

function renderSection(requests, overrides = {}) {
  const updateRequest = vi.fn()
  const setStatus = vi.fn()
  const setOrdering = vi.fn()
  const refresh = vi.fn()
  useManagerServiceRequests.mockReturnValue({
    requests,
    summary: sampleSummary,
    status: StatusFilter.ALL,
    setStatus,
    ordering: SortOrder.NEWEST,
    setOrdering,
    loading: false,
    refreshing: false,
    error: '',
    refresh,
    updateRequest,
    ...overrides,
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
  return { updateRequest, setStatus, setOrdering, refresh }
}

describe('ServiceRequestsSection', () => {
  beforeEach(() => {
    useManagerServiceRequests.mockReset()
    useServiceStaff.mockReset()
    managerServiceRequestApi.assignStaff.mockReset()
    managerServiceRequestApi.settleRequest.mockReset()
  })

  describe('status filtering', () => {
    const tab = (name) => screen.getByRole('tab', { name: new RegExp(name) })

    it('offers a tab per status with the building-wide counts', () => {
      renderSection([pendingRequest, assignedRequest, completedRequest])

      const tabs = screen.getAllByRole('tab')
      expect(tabs.map((node) => node.textContent)).toEqual([
        'همه9',
        'در انتظار بررسی4',
        'ارجاع‌شده2',
        'تکمیل‌شده3',
      ])
    })

    it('marks the active filter and starts on "all"', () => {
      renderSection([pendingRequest])

      expect(tab('همه')).toHaveAttribute('aria-selected', 'true')
      expect(tab('در انتظار بررسی')).toHaveAttribute('aria-selected', 'false')
    })

    it('asks the hook for the chosen status', async () => {
      const user = userEvent.setup()
      const { setStatus } = renderSection([pendingRequest, assignedRequest])

      await user.click(tab('تکمیل‌شده'))

      expect(setStatus).toHaveBeenCalledWith(StatusFilter.COMPLETED)
    })

    it('reflects an active filter in the header count and the selected tab', () => {
      renderSection([completedRequest], { status: StatusFilter.COMPLETED })

      expect(tab('تکمیل‌شده')).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('1 درخواست با وضعیت «تکمیل‌شده».')).toBeInTheDocument()
    })

    it('keeps the summary cards on the building totals while filtered', () => {
      // The card title is a <p>; the same words also label a filter tab.
      const cardValue = (title) =>
        screen.getByText(title, { selector: 'p' }).parentElement.querySelector('h3').textContent

      renderSection([completedRequest], { status: StatusFilter.COMPLETED })

      // Only one completed request is listed, but four are still pending
      // overall — the cards must not collapse to the filtered view.
      expect(cardValue('در انتظار بررسی')).toBe('4')
      expect(cardValue('ارجاع‌شده')).toBe('2')
      expect(cardValue('تکمیل‌شده')).toBe('3')
    })

    it('explains an empty filtered view in terms of that status', async () => {
      const user = userEvent.setup()
      const { setStatus } = renderSection([], { status: StatusFilter.COMPLETED })

      expect(screen.getByText('درخواست تکمیل‌شده‌ای وجود ندارد')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'نمایش همه درخواست‌ها' }))
      expect(setStatus).toHaveBeenCalledWith(StatusFilter.ALL)
    })

    it('keeps the original wording when nothing has ever been filed', () => {
      renderSection([], { status: StatusFilter.ALL })

      expect(screen.getByText('هنوز درخواستی ثبت نشده است')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'نمایش همه درخواست‌ها' }),
      ).not.toBeInTheDocument()
    })

    it('dims the list instead of emptying it while a filter is loading', () => {
      renderSection([pendingRequest], { refreshing: true })

      const list = screen.getByRole('article').parentElement
      expect(list).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByText('نشتی آب')).toBeInTheDocument()
    })

    it('disables the controls until the first load finishes', () => {
      renderSection([], { loading: true })

      screen.getAllByRole('tab').forEach((node) => expect(node).toBeDisabled())
      expect(screen.getByLabelText('ترتیب نمایش بر اساس تاریخ ثبت')).toBeDisabled()
    })
  })

  describe('sorting', () => {
    it('defaults to newest first and can be flipped to oldest', async () => {
      const user = userEvent.setup()
      const { setOrdering } = renderSection([pendingRequest])

      const select = screen.getByLabelText('ترتیب نمایش بر اساس تاریخ ثبت')
      expect(select).toHaveValue(SortOrder.NEWEST)

      await user.selectOptions(select, SortOrder.OLDEST)
      expect(setOrdering).toHaveBeenCalledWith(SortOrder.OLDEST)
    })

    it('renders the requests in the order the backend returned them', () => {
      renderSection([assignedRequest, pendingRequest, completedRequest])

      const titles = screen.getAllByRole('article').map(
        (card) => within(card).getByRole('heading', { level: 3 }).textContent,
      )
      expect(titles).toEqual(['تعمیر آسانسور', 'نشتی آب', 'تعویض لامپ'])
    })
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
