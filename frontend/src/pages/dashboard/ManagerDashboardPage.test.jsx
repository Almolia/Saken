import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ToastProvider'
import { authApi, managerApi } from '../../lib/api'
import { managerMessageApi } from '../../lib/messagingApi'
import { managerPollApi } from '../../lib/pollApi'
import { ManagerDashboardPage } from './ManagerDashboardPage'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../../lib/api', () => ({
  authApi: {
    logout: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
  managerApi: {
    announcements: vi.fn(),
    units: vi.fn(),
  },
}))

vi.mock('../../lib/pollApi', () => ({
  managerPollApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    close: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('../../lib/messagingApi', () => ({
  managerMessageApi: {
    list: vi.fn(),
    broadcast: vi.fn(),
    thread: vi.fn(),
    reply: vi.fn(),
    markRead: vi.fn(),
  },
  normalizeConversations: (data) => (Array.isArray(data?.conversations) ? data.conversations : []),
  unreadTotalFrom: (data, conversations = []) =>
    typeof data?.unread_total === 'number'
      ? data.unread_total
      : conversations.reduce((sum, item) => sum + (Number(item.unread_count) || 0), 0),
}))

vi.mock('../../hooks/useUserDirectory', () => ({
  useUserDirectory: () => ({
    data: { users: [] },
    actionState: {},
    changeRole: vi.fn(),
  }),
}))

vi.mock('../../hooks/useManagerServiceRequests', () => ({
  useManagerServiceRequests: () => ({
    requests: [],
    summary: { Pending: 0, Assigned: 0, Completed: 0 },
    status: 'all',
    setStatus: vi.fn(),
    ordering: '-created_at',
    setOrdering: vi.fn(),
    loading: false,
    refreshing: false,
    error: '',
    refresh: vi.fn(),
    updateRequest: vi.fn(),
  }),
}))

vi.mock('../../hooks/useServiceStaff', () => ({
  useServiceStaff: () => ({
    staff: [],
    loading: false,
  }),
}))

vi.mock('../../hooks/useFinancialReports', () => ({
  useFinancialReports: () => ({
    summary: {
      total_collected_revenue: '500000.00',
      total_outstanding_debt: '250000.00',
    },
    records: [
      {
        id: 10,
        unit_number: '101',
        title: 'شارژ ماهیانه',
        description: 'هزینه مشاعات',
        status: 'Paid',
        amount: '500000.00',
        due_date: '2026-08-20',
        created_at: '2026-08-01',
      },
    ],
    filteredRecords: [
      {
        id: 10,
        unit_number: '101',
        title: 'شارژ ماهیانه',
        description: 'هزینه مشاعات',
        status: 'Paid',
        amount: '500000.00',
        due_date: '2026-08-20',
        created_at: '2026-08-01',
      },
    ],
    search: '',
    setSearch: vi.fn(),
    clearSearch: vi.fn(),
    loading: false,
    refreshing: false,
    error: '',
    refresh: vi.fn(),
  }),
}))

vi.mock('../../hooks/useServiceReports', () => ({
  useServiceReports: () => ({
    summary: { Pending: 2, Assigned: 1, Completed: 3 },
    requests: [
      {
        id: 1,
        title: 'تعمیر آسانسور',
        description: 'موتور آسانسور صدا می‌دهد',
        status: 'Pending',
        unit_number: '101',
        resident: { id: 1, full_name: 'سارا احمدی', phone: '09121111111' },
        assigned_staff: null,
        created_at: '2026-08-10',
      },
    ],
    search: '',
    setSearch: vi.fn(),
    debouncedSearch: '',
    loading: false,
    refreshing: false,
    searching: false,
    error: '',
    refresh: vi.fn(),
  }),
}))

vi.mock('../../hooks/useAmenityReports', () => ({
  useAmenityReports: () => ({
    reservations: [
      {
        id: 1,
        amenity: 1,
        amenity_name: 'استخر',
        resident: 5,
        resident_name: 'سارا احمدی',
        start_time: '2026-08-10T18:00:00',
        end_time: '2026-08-10T19:00:00',
        status: 'Active',
        created_at: '2026-08-01T10:00:00Z',
      },
    ],
    amenities: [{ id: 1, name: 'استخر' }],
    amenitiesError: '',
    summary: { total: 1, active: 1, canceled: 0 },
    search: '',
    setSearch: vi.fn(),
    clearSearch: vi.fn(),
    debouncedSearch: '',
    isDebouncing: false,
    amenity: '',
    setAmenity: vi.fn(),
    date: '',
    setDate: vi.fn(),
    hasFilters: false,
    clearFilters: vi.fn(),
    loading: false,
    refreshing: false,
    searching: false,
    error: '',
    refresh: vi.fn(),
  }),
}))

const authState = {
  loading: false,
  user: { id: 1, full_name: 'مدیر ساختمان', phone: '09120000000', role: 'manager' },
}

function renderPage(setAuthState = vi.fn()) {
  render(
    <MemoryRouter>
      <ToastProvider>
        <ManagerDashboardPage authState={authState} setAuthState={setAuthState} />
      </ToastProvider>
    </MemoryRouter>,
  )
  return { setAuthState }
}

describe('ManagerDashboardPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    authApi.logout.mockReset()
    authApi.updateProfile.mockReset()
    authApi.changePassword.mockReset()
    managerApi.announcements.mockReset()
    managerApi.units?.mockReset?.()
    managerApi.units?.mockResolvedValue?.({ units: [] })
    managerMessageApi.list.mockReset()
    managerMessageApi.list.mockResolvedValue({ conversations: [], unread_total: 0 })
    managerPollApi.list.mockReset()
    managerPollApi.list.mockResolvedValue({
      polls: [
        {
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
        },
      ],
    })
    managerApi.announcements.mockResolvedValue({
      announcements: [
        {
          id: 1,
          title: 'قطع آب ساختمان',
          content: 'آب ساختمان فردا از ساعت ۹ تا ۱۲ قطع خواهد بود.',
          author_name: 'مدیر ساختمان',
          is_active: true,
          created_at: '2026-08-16T09:00:00Z',
          updated_at: '2026-08-16T09:00:00Z',
        },
      ],
    })
  })

  it('renders manager dashboard shell with sidebar navigation items', async () => {
    renderPage()

    expect(screen.getByText('پنل مدیر')).toBeInTheDocument()
    await waitFor(() => expect(managerMessageApi.list).toHaveBeenCalled())
    expect(screen.getAllByText('درخواست‌های خدمات').length).toBeGreaterThan(0)
    expect(screen.getAllByText('گزارش خدمات').length).toBeGreaterThan(0)
    expect(screen.getAllByText('تنظیمات ساختمان').length).toBeGreaterThan(0)
    expect(screen.getAllByText('فهرست واحدها').length).toBeGreaterThan(0)
    expect(screen.getAllByText('امکانات').length).toBeGreaterThan(0)
    expect(screen.getAllByText('گزارش رزرو امکانات').length).toBeGreaterThan(0)
    expect(screen.getAllByText('اطلاعیه‌ها').length).toBeGreaterThan(0)
    expect(screen.getAllByText('نظرسنجی‌ها').length).toBeGreaterThan(0)
    expect(screen.getAllByText('پیام‌ها').length).toBeGreaterThan(0)
    expect(screen.getAllByText('امور مالی').length).toBeGreaterThan(0)
    expect(screen.getAllByText('گزارش مالی').length).toBeGreaterThan(0)
    expect(screen.getAllByText('کاربران').length).toBeGreaterThan(0)
    expect(screen.getAllByText('حساب کاربری').length).toBeGreaterThan(0)
  })

  it('opens the account section and saves manager profile changes', async () => {
    const user = userEvent.setup()
    authApi.updateProfile.mockResolvedValue({
      message: 'اطلاعات حساب با موفقیت ذخیره شد.',
      user: {
        id: 1,
        full_name: 'مدیر ویرایش شده',
        username: 'manager-edited',
        phone: '09120000000',
        national_id: '1234567890',
        role: 'manager',
      },
    })
    const { setAuthState } = renderPage()

    await user.click(screen.getAllByRole('button', { name: 'حساب کاربری' })[0])

    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { name: 'حساب کاربری' })).toBeInTheDocument()
    expect(within(main).getByText('ویرایش اطلاعات مدیر')).toBeInTheDocument()

    const nameInput = screen.getByLabelText('نام و نام خانوادگی')
    await user.clear(nameInput)
    await user.type(nameInput, 'مدیر ویرایش شده')
    await user.type(screen.getByLabelText('نام کاربری'), 'manager-edited')
    await user.type(screen.getByLabelText('کد ملی'), '1234567890')
    await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }))

    await waitFor(() => expect(authApi.updateProfile).toHaveBeenCalledTimes(1))
    expect(setAuthState).toHaveBeenCalledWith({
      loading: false,
      user: expect.objectContaining({ full_name: 'مدیر ویرایش شده' }),
    })
    expect(await screen.findByText('اطلاعات حساب با موفقیت ذخیره شد.')).toBeInTheDocument()
  })

  it('switches to the Service Reports section when clicking the tab', async () => {
    const user = userEvent.setup()
    renderPage()

    const serviceReportsBtn = screen.getAllByText('گزارش خدمات')[0]
    await user.click(serviceReportsBtn)

    expect(screen.getByRole('heading', { name: 'گزارش خدمات', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('آمار و گزارش درخواست‌های خدمات')).toBeInTheDocument()
    expect(screen.getByText('فهرست گزارش درخواست‌ها')).toBeInTheDocument()
    expect(screen.getByText('تعمیر آسانسور')).toBeInTheDocument()
  })

  it('switches to the Financial Reports section and renders live ledger data', async () => {
    const user = userEvent.setup()
    renderPage()

    const financialReportsButton = screen.getAllByText('گزارش مالی')[0]
    await user.click(financialReportsButton)

    expect(screen.getByRole('heading', { name: 'گزارش مالی', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('نمای کلی درآمد و بدهی‌ها')).toBeInTheDocument()
    expect(screen.getByText('سوابق مالی واحدها')).toBeInTheDocument()
    expect(screen.getByText('شارژ ماهیانه')).toBeInTheDocument()
    expect(screen.getAllByText('500,000 تومان').length).toBeGreaterThan(0)
  })

  it('switches to the Amenity Booking Reports section and renders the booking log', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getAllByText('گزارش رزرو امکانات')[0])

    expect(screen.getByRole('heading', { name: 'گزارش رزرو امکانات', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('سوابق کامل رزرو فضاهای مشترک')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'جستجو در رزروهای امکانات' })).toBeInTheDocument()

    const log = within(screen.getByRole('table'))
    expect(log.getByText('استخر')).toBeInTheDocument()
    expect(log.getByText('سارا احمدی')).toBeInTheDocument()
    expect(log.getByText('فعال')).toBeInTheDocument()
  })

  it('switches to the Announcements section and offers the publish action', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getAllByText('اطلاعیه‌ها')[0])

    expect(screen.getByRole('heading', { name: 'اطلاعیه‌ها', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'انتشار اطلاعیه جدید' })).toBeInTheDocument()
    expect(await screen.findByText('قطع آب ساختمان')).toBeInTheDocument()
  })

  it('switches to the Polls section and lists the building polls', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getAllByText('نظرسنجی‌ها')[0])

    expect(screen.getByRole('heading', { name: 'نظرسنجی‌ها', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('نظرسنجی‌های ساختمان')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ایجاد نظرسنجی جدید' })).toBeInTheDocument()
    expect(await screen.findByText('رنگ نمای جدید ساختمان کدام باشد؟')).toBeInTheDocument()

    const polls = within(screen.getByRole('list', { name: 'نظرسنجی‌های ساختمان' }))
    expect(polls.getByText('پیش‌نویس')).toBeInTheDocument()
    expect(polls.getByText('2 گزینه')).toBeInTheDocument()
    expect(polls.getByText('همه واحدها')).toBeInTheDocument()
  })

  it('switches to the Messages section and offers the broadcast action', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getAllByText('پیام‌ها')[0])

    expect(screen.getByRole('heading', { name: 'پیام‌ها', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'پیام همگانی' })).toBeInTheDocument()
    expect(await screen.findByText('هنوز گفتگویی وجود ندارد')).toBeInTheDocument()
  })

  it('handles manager logout', async () => {
    const user = userEvent.setup()
    authApi.logout.mockResolvedValue({})
    const { setAuthState } = renderPage()

    const logoutBtn = screen.getAllByRole('button', { name: /خروج/ })[0]
    await user.click(logoutBtn)

    await waitFor(() => expect(authApi.logout).toHaveBeenCalledTimes(1))
    expect(setAuthState).toHaveBeenCalledWith({ loading: false, user: null })
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
  })
})
