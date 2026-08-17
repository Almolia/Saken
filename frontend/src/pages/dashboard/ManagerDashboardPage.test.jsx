import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ToastProvider'
import { authApi } from '../../lib/api'
import { ManagerDashboardPage } from './ManagerDashboardPage'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../../lib/api', () => ({
  authApi: {
    logout: vi.fn(),
  },
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
  })

  it('renders manager dashboard shell with sidebar navigation items', () => {
    renderPage()

    expect(screen.getByText('پنل مدیر')).toBeInTheDocument()
    expect(screen.getAllByText('درخواست‌های خدمات').length).toBeGreaterThan(0)
    expect(screen.getAllByText('گزارش خدمات').length).toBeGreaterThan(0)
    expect(screen.getAllByText('تنظیمات ساختمان').length).toBeGreaterThan(0)
    expect(screen.getAllByText('فهرست واحدها').length).toBeGreaterThan(0)
    expect(screen.getAllByText('امکانات').length).toBeGreaterThan(0)
    expect(screen.getAllByText('امور مالی').length).toBeGreaterThan(0)
    expect(screen.getAllByText('گزارش مالی').length).toBeGreaterThan(0)
    expect(screen.getAllByText('کاربران').length).toBeGreaterThan(0)
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
