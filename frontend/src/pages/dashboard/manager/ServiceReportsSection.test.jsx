import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useServiceReports } from '../../../hooks/useServiceReports'
import { ServiceReportsSection } from './ServiceReportsSection'

vi.mock('../../../hooks/useServiceReports', () => ({
  useServiceReports: vi.fn(),
}))

const sampleRequests = [
  {
    id: 1,
    title: 'نشتی آب',
    description: 'لوله زیر سینک چکه می‌کند',
    status: 'Pending',
    unit_number: '101',
    resident: { id: 10, full_name: 'سارا احمدی', phone: '09121111111' },
    assigned_staff: null,
    created_at: '2026-08-10T10:00:00Z',
  },
  {
    id: 2,
    title: 'تعمیر کلید برق',
    description: 'کلید قطع شده',
    status: 'Assigned',
    unit_number: '102',
    resident: { id: 11, full_name: 'علی رضایی', phone: '09122222222' },
    assigned_staff: { id: 20, full_name: 'متین محمودی', phone: '09123333333' },
    created_at: '2026-08-11T12:00:00Z',
  },
  {
    id: 3,
    title: 'تعمیر قفل درب',
    description: 'قفل گیر کرده است',
    status: 'Completed',
    unit_number: '103',
    resident: { id: 12, full_name: 'مریم حسینی', phone: '09124444444' },
    assigned_staff: { id: 20, full_name: 'متین محمودی', phone: '09123333333' },
    created_at: '2026-08-12T14:00:00Z',
  },
]

function renderSection(overrides = {}) {
  const refresh = vi.fn()
  const setSearch = vi.fn()
  useServiceReports.mockReturnValue({
    summary: {
      Pending: 3,
      Assigned: 2,
      Completed: 5,
      pending: 3,
      assigned: 2,
      completed: 5,
    },
    requests: sampleRequests,
    search: '',
    setSearch,
    debouncedSearch: '',
    loading: false,
    refreshing: false,
    searching: false,
    error: '',
    refresh,
    ...overrides,
  })

  render(<ServiceReportsSection />)
  return { refresh, setSearch }
}

describe('ServiceReportsSection', () => {
  beforeEach(() => {
    useServiceReports.mockReset()
  })

  it('renders live metric cards for Pending, Assigned, and Completed tasks', () => {
    renderSection()

    expect(screen.getAllByText('در انتظار بررسی').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ارجاع‌شده').length).toBeGreaterThan(0)
    expect(screen.getAllByText('تکمیل‌شده').length).toBeGreaterThan(0)

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders the data table with columns for Unit, Resident, Assigned Staff, Status, and Date', () => {
    renderSection()

    const table = screen.getByRole('table')
    expect(within(table).getByText('واحد')).toBeInTheDocument()
    expect(within(table).getByText('ساکن')).toBeInTheDocument()
    expect(within(table).getByText('کارمند ارجاع‌شده')).toBeInTheDocument()
    expect(within(table).getByText('وضعیت')).toBeInTheDocument()
    expect(within(table).getByText('تاریخ')).toBeInTheDocument()

    // Row data
    expect(within(table).getByText('واحد 101')).toBeInTheDocument()
    expect(within(table).getByText('سارا احمدی')).toBeInTheDocument()
    expect(within(table).getByText('تخصیص‌نیافته')).toBeInTheDocument()

    expect(within(table).getByText('واحد 102')).toBeInTheDocument()
    expect(within(table).getByText('علی رضایی')).toBeInTheDocument()
    expect(within(table).getAllByText('متین محمودی').length).toBeGreaterThan(0)
  })

  it('triggers search handler when typing in the unified search bar', async () => {
    const user = userEvent.setup()
    const { setSearch } = renderSection()

    const searchInput = screen.getByRole('searchbox', { name: 'جستجو در درخواست‌های خدمات' })
    expect(searchInput).toBeInTheDocument()

    await user.type(searchInput, 'احمدی')
    expect(setSearch).toHaveBeenCalled()
  })

  it('shows empty search state when no records match', () => {
    renderSection({
      requests: [],
      search: 'عبارت ناموجود',
    })

    expect(screen.getByText('نتیجه‌ای برای این جستجو پیدا نشد')).toBeInTheDocument()
  })

  it('shows error state and offers retry button on error', () => {
    const { refresh } = renderSection({
      requests: [],
      error: 'خطای شبکه در دریافت اطلاعات',
    })

    expect(screen.getByText('خطای شبکه در دریافت اطلاعات')).toBeInTheDocument()
    const retryBtn = screen.getByText('تلاش مجدد')
    expect(retryBtn).toBeInTheDocument()
    retryBtn.click()
    expect(refresh).toHaveBeenCalled()
  })
})
