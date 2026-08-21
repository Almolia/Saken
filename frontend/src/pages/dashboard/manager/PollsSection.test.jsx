import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/ToastProvider'
import { managerApi } from '../../../lib/api'
import { managerPollApi } from '../../../lib/pollApi'
import { PollsSection } from './PollsSection'

vi.mock('../../../lib/api', () => ({
  managerApi: { units: vi.fn() },
}))

vi.mock('../../../lib/pollApi', () => ({
  managerPollApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    close: vi.fn(),
    remove: vi.fn(),
  },
}))

const units = [
  { id: 7, unit_number: '101', floor: 1, owner: { id: 3, full_name: 'سارا احمدی' } },
  { id: 8, unit_number: '102', floor: 1, owner: null },
]

const draft = {
  id: 1,
  title: 'رنگ نمای جدید ساختمان کدام باشد؟',
  description: 'نما امسال بازسازی می‌شود.',
  status: 'Draft',
  starts_at: null,
  ends_at: '2026-09-06T20:30:00Z',
  target_units: [],
  options: [
    { id: 1, text: 'کرم', position: 0 },
    { id: 2, text: 'خاکستری', position: 1 },
  ],
  created_by_name: 'مدیر ساختمان',
  created_at: '2026-08-10T09:00:00Z',
  total_units: 12,
}

const activePoll = {
  id: 2,
  title: 'ساعت تخلیه زباله',
  description: '',
  status: 'Active',
  starts_at: '2026-08-18T09:00:00Z',
  ends_at: '2026-09-20T20:30:00Z',
  target_units: [7],
  options: [
    { id: 3, text: 'ساعت ۸ صبح', position: 0 },
    { id: 4, text: 'ساعت ۸ شب', position: 1 },
  ],
  created_by_name: 'مدیر ساختمان',
  created_at: '2026-08-18T09:00:00Z',
  total_units: 1,
}

const closedPoll = {
  ...draft,
  id: 3,
  title: 'نصب دوربین در پارکینگ',
  status: 'Closed',
  created_at: '2026-08-01T09:00:00Z',
}

function renderSection() {
  render(
    <ToastProvider>
      <PollsSection />
    </ToastProvider>,
  )
}

// The status words also appear on the filter chips, so poll assertions are
// scoped to the list itself.
const pollList = () => within(screen.getByRole('list', { name: 'نظرسنجی‌های ساختمان' }))

describe('PollsSection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-08-20T09:00:00Z') })
    managerPollApi.list.mockReset()
    managerPollApi.list.mockResolvedValue({ polls: [activePoll, draft, closedPoll] })
    managerPollApi.create.mockReset()
    managerPollApi.update.mockReset()
    managerPollApi.publish.mockReset()
    managerPollApi.close.mockReset()
    managerPollApi.remove.mockReset()
    managerApi.units.mockReset()
    managerApi.units.mockResolvedValue({ units })
  })

  it('shows the loading state before the list arrives', () => {
    managerPollApi.list.mockReturnValue(new Promise(() => {}))
    renderSection()

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument()
  })

  it('renders each poll with its status, option count, target and deadline', async () => {
    renderSection()

    expect(await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')).toBeInTheDocument()
    expect(screen.getByText('ساعت تخلیه زباله')).toBeInTheDocument()
    expect(screen.getByText('نصب دوربین در پارکینگ')).toBeInTheDocument()

    expect(pollList().getByText('پیش‌نویس')).toBeInTheDocument()
    expect(pollList().getByText('فعال')).toBeInTheDocument()
    expect(pollList().getByText('بسته‌شده')).toBeInTheDocument()

    expect(screen.getAllByText('2 گزینه')).toHaveLength(3)
    expect(screen.getAllByText('همه واحدها')).toHaveLength(2)
    expect(screen.getByText('1 واحد منتخب')).toBeInTheDocument()
    // The target unit ids are resolved against the unit directory.
    expect(screen.getByText(/واحد 101/)).toBeInTheDocument()
  })

  it('counts every status on the summary cards', async () => {
    renderSection()

    await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')
    const cards = screen.getByLabelText('شاخص‌های نظرسنجی')
    expect(within(cards).getByText('کل نظرسنجی‌ها').closest('div')).toHaveTextContent('3')
  })

  it('offers only the transitions the server would accept', async () => {
    renderSection()
    await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')

    // A draft can be edited, published or discarded — but not closed.
    expect(screen.getByRole('button', { name: /ویرایش/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /انتشار/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /حذف/ })).toBeInTheDocument()
    // Exactly one poll is active, so exactly one close button exists.
    expect(screen.getAllByRole('button', { name: /بستن نظرسنجی/ })).toHaveLength(1)
  })

  it('narrows the list by status without changing the totals', async () => {
    const user = userEvent.setup()
    renderSection()
    await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')

    await user.click(screen.getByRole('button', { name: 'پیش‌نویس', pressed: false }))

    expect(screen.queryByText('ساعت تخلیه زباله')).not.toBeInTheDocument()
    expect(screen.getByText('رنگ نمای جدید ساختمان کدام باشد؟')).toBeInTheDocument()
    expect(screen.getByText('1 نظرسنجی از 3 نظرسنجی نمایش داده می‌شود.')).toBeInTheDocument()
  })

  it('searches the option texts and tells an empty filter from an empty building', async () => {
    const user = userEvent.setup()
    renderSection()
    await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')

    await user.type(screen.getByRole('searchbox', { name: 'جستجو در نظرسنجی‌ها' }), 'ساعت ۸ صبح')

    expect(screen.getByText('ساعت تخلیه زباله')).toBeInTheDocument()
    expect(screen.queryByText('نصب دوربین در پارکینگ')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: 'جستجو در نظرسنجی‌ها' }))
    await user.type(screen.getByRole('searchbox', { name: 'جستجو در نظرسنجی‌ها' }), 'آسانسور')

    expect(screen.getByText('نظرسنجی‌ای با این فیلترها پیدا نشد')).toBeInTheDocument()
  })

  it('invites the manager to create the first poll when there is none', async () => {
    managerPollApi.list.mockResolvedValue({ polls: [] })
    renderSection()

    expect(await screen.findByText('هنوز نظرسنجی‌ای ساخته نشده است')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ایجاد نظرسنجی جدید/ })).toBeInTheDocument()
  })

  it('surfaces a failed load with a retry', async () => {
    const user = userEvent.setup()
    managerPollApi.list
      .mockRejectedValueOnce(new Error('خطایی در ارتباط با سرور رخ داد.'))
      .mockResolvedValueOnce({ polls: [draft] })
    renderSection()

    expect(await screen.findByText('خطایی در ارتباط با سرور رخ داد.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تلاش مجدد' }))

    expect(await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')).toBeInTheDocument()
  })

  it('keeps working when only the unit directory fails', async () => {
    managerApi.units.mockRejectedValue(new Error('خطایی در دریافت فهرست واحدها رخ داد.'))
    renderSection()

    expect(await screen.findByText(/خطایی در دریافت فهرست واحدها رخ داد./)).toBeInTheDocument()
    expect(screen.getByText('ساعت تخلیه زباله')).toBeInTheDocument()
    // Without the directory the id is still shown rather than the poll's reach
    // being understated.
    expect(screen.getByText(/#7/)).toBeInTheDocument()
  })

  it('publishes a draft from the list and moves it into the active bucket', async () => {
    const user = userEvent.setup()
    managerPollApi.publish.mockResolvedValue({
      message: 'نظرسنجی با موفقیت منتشر شد.',
      poll: { ...draft, status: 'Active', starts_at: '2026-08-20T09:00:00Z' },
    })
    renderSection()
    await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')

    await user.click(screen.getByRole('button', { name: /^انتشار$/ }))
    await user.click(screen.getByRole('button', { name: 'بله، منتشر شود' }))

    await waitFor(() => expect(managerPollApi.publish).toHaveBeenCalledWith(1))
    // The list is updated from the response rather than being refetched.
    expect(managerPollApi.list).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(pollList().queryByText('پیش‌نویس')).not.toBeInTheDocument())
  })

  it('closes an active poll from the list', async () => {
    const user = userEvent.setup()
    managerPollApi.close.mockResolvedValue({
      message: 'نظرسنجی با موفقیت بسته شد.',
      poll: { ...activePoll, status: 'Closed' },
    })
    renderSection()
    await screen.findByText('ساعت تخلیه زباله')

    await user.click(screen.getByRole('button', { name: /بستن نظرسنجی/ }))
    await user.click(screen.getByRole('button', { name: 'بله، نظرسنجی بسته شود' }))

    await waitFor(() => expect(managerPollApi.close).toHaveBeenCalledWith(2))
    await waitFor(() => expect(pollList().queryByText('فعال')).not.toBeInTheDocument())
  })

  it('drops a deleted draft out of the list', async () => {
    const user = userEvent.setup()
    managerPollApi.remove.mockResolvedValue({ message: 'نظرسنجی با موفقیت حذف شد.' })
    renderSection()
    await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')

    await user.click(screen.getByRole('button', { name: /^حذف$/ }))
    await user.click(screen.getByRole('button', { name: 'بله، پیش‌نویس حذف شود' }))

    await waitFor(() => expect(managerPollApi.remove).toHaveBeenCalledWith(1))
    await waitFor(() =>
      expect(screen.queryByText('رنگ نمای جدید ساختمان کدام باشد؟')).not.toBeInTheDocument(),
    )
  })

  it('opens the edit form filled in with the draft', async () => {
    const user = userEvent.setup()
    renderSection()
    await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')

    await user.click(screen.getByRole('button', { name: /ویرایش/ }))

    expect(screen.getByRole('heading', { name: 'ویرایش نظرسنجی' })).toBeInTheDocument()
    expect(screen.getByLabelText(/پرسش نظرسنجی/)).toHaveValue('رنگ نمای جدید ساختمان کدام باشد؟')
    expect(screen.getByLabelText('گزینه 1')).toHaveValue('کرم')
  })

  it('adds a newly created poll to the top of the list', async () => {
    const user = userEvent.setup()
    const created = {
      ...draft,
      id: 9,
      title: 'کدام روز برای جلسه ساختمان مناسب است؟',
      created_at: '2026-08-20T09:00:00Z',
    }
    managerPollApi.create.mockResolvedValue({ message: 'نظرسنجی با موفقیت ایجاد شد.', poll: created })
    renderSection()
    await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')

    await user.click(screen.getByRole('button', { name: /ایجاد نظرسنجی جدید/ }))
    await user.type(screen.getByLabelText(/پرسش نظرسنجی/), 'کدام روز برای جلسه ساختمان مناسب است؟')
    await user.type(screen.getByLabelText('گزینه 1'), 'شنبه')
    await user.type(screen.getByLabelText('گزینه 2'), 'یکشنبه')
    await user.type(screen.getByLabelText('تاریخ پایان'), '1405/06/05')
    await user.click(screen.getByRole('button', { name: /ذخیره پیش‌نویس/ }))

    await waitFor(() => expect(managerPollApi.create).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('نظرسنجی با موفقیت ایجاد شد.')).toBeInTheDocument()
    expect(pollList().getAllByRole('heading')[0]).toHaveTextContent(
      'کدام روز برای جلسه ساختمان مناسب است؟',
    )
  })

  it('warns that publishing a stale draft would produce a poll nobody can answer', async () => {
    managerPollApi.list.mockResolvedValue({
      polls: [{ ...draft, ends_at: '2026-08-19T09:00:00Z' }],
    })
    renderSection()

    expect(await screen.findByText(/مهلت این پیش‌نویس گذشته است/)).toBeInTheDocument()
    // The draft is still publishable — the server allows it — so the warning is
    // what has to carry the consequence.
    expect(screen.getByRole('button', { name: /^انتشار$/ })).toBeInTheDocument()
  })

  it('warns when an active poll has run past its deadline', async () => {
    managerPollApi.list.mockResolvedValue({
      polls: [{ ...activePoll, ends_at: '2026-08-19T09:00:00Z' }],
    })
    renderSection()

    expect(
      await screen.findByText(/مهلت رأی‌گیری این نظرسنجی گذشته است/),
    ).toBeInTheDocument()
  })
})
