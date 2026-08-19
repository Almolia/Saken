import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAmenityReports } from '../../../hooks/useAmenityReports'
import { AmenityReportsSection } from './AmenityReportsSection'

vi.mock('../../../hooks/useAmenityReports', () => ({
  useAmenityReports: vi.fn(),
}))

const sampleReservations = [
  {
    id: 2,
    amenity: 2,
    amenity_name: 'باشگاه ورزشی',
    resident: 11,
    resident_name: 'علی رضایی',
    start_time: '2026-09-10T08:00:00',
    end_time: '2026-09-10T09:30:00',
    status: 'Canceled',
    created_at: '2026-08-02T10:00:00Z',
  },
  {
    id: 1,
    amenity: 1,
    amenity_name: 'استخر',
    resident: 10,
    resident_name: 'سارا احمدی',
    start_time: '2026-08-10T18:00:00',
    end_time: '2026-08-10T19:00:00',
    status: 'Active',
    created_at: '2026-08-01T10:00:00Z',
  },
]

const sampleAmenities = [
  { id: 1, name: 'استخر' },
  { id: 2, name: 'باشگاه ورزشی' },
]

function renderSection(overrides = {}) {
  const handlers = {
    setSearch: vi.fn(),
    clearSearch: vi.fn(),
    setAmenity: vi.fn(),
    setDate: vi.fn(),
    clearFilters: vi.fn(),
    refresh: vi.fn(),
  }

  useAmenityReports.mockReturnValue({
    reservations: sampleReservations,
    amenities: sampleAmenities,
    amenitiesError: '',
    summary: { total: 2, active: 1, canceled: 1 },
    search: '',
    debouncedSearch: '',
    isDebouncing: false,
    amenity: '',
    date: '',
    hasFilters: false,
    loading: false,
    refreshing: false,
    searching: false,
    error: '',
    ...handlers,
    ...overrides,
  })

  return { ...handlers, ...render(<AmenityReportsSection />) }
}

const table = () => within(screen.getByRole('table'))
const rowNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent)

describe('AmenityReportsSection', () => {
  beforeEach(() => {
    useAmenityReports.mockReset()
  })

  it('renders the master log with a column for every reported field', () => {
    renderSection()

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers).toEqual([
      'امکان',
      'ساکن',
      'زمان شروع',
      'زمان پایان',
      'وضعیت',
      'تاریخ ثبت',
    ])
  })

  it('shows the amenity, resident, booked hours and status of each booking', () => {
    renderSection()

    expect(table().getByText('استخر')).toBeInTheDocument()
    expect(table().getByText('سارا احمدی')).toBeInTheDocument()
    expect(table().getByText('باشگاه ورزشی')).toBeInTheDocument()
    expect(table().getByText('علی رضایی')).toBeInTheDocument()

    // Start and end are separate columns, each with its own clock time.
    expect(table().getByText('18:00')).toBeInTheDocument()
    expect(table().getByText('19:00')).toBeInTheDocument()

    expect(table().getByText('فعال')).toBeInTheDocument()
    expect(table().getByText('لغوشده')).toBeInTheDocument()
  })

  it('keeps the order the hook handed it, newest booking first', () => {
    renderSection()
    expect(rowNames()).toEqual(['باشگاه ورزشی', 'استخر'])
  })

  it('reports how many bookings are on screen', () => {
    renderSection()
    expect(screen.getByText('2 رزرو نمایش داده می‌شود.')).toBeInTheDocument()
  })

  it('offers one global search box with the examples from the story', () => {
    renderSection()

    const input = screen.getByRole('searchbox', { name: 'جستجو در رزروهای امکانات' })
    expect(input).toHaveAttribute(
      'placeholder',
      'نام امکان (مثلاً استخر)، وضعیت (مثلاً لغوشده) یا نام ساکن...',
    )
    // One box for everything, not a field per column.
    expect(screen.getAllByRole('searchbox')).toHaveLength(1)
  })

  it('hands every keystroke straight to the hook, which owns the debounce', async () => {
    const user = userEvent.setup()
    const { setSearch } = renderSection()

    await user.type(screen.getByRole('searchbox', { name: 'جستجو در رزروهای امکانات' }), 'استخر')

    // The box itself never swallows or delays input; the request-level
    // debounce lives in useAmenityReports, next to the fetch it protects.
    expect(setSearch).toHaveBeenCalledTimes(5)
    expect(setSearch.mock.calls.at(-1)[0]).toBe('ر')
  })

  it('shows a spinner and keeps the previous rows while a search is in flight', () => {
    renderSection({ search: 'استخر', searching: true })

    expect(
      screen.getByText('در حال جستجو؛ نتایج قبلی تا دریافت پاسخ حفظ شده‌اند.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'جستجو در رزروهای امکانات' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(table().getByText('استخر')).toBeInTheDocument()
  })

  it('treats a still-settling keystroke as a search in progress', () => {
    renderSection({ search: 'اس', isDebouncing: true })

    expect(
      screen.getByText('در حال جستجو؛ نتایج قبلی تا دریافت پاسخ حفظ شده‌اند.'),
    ).toBeInTheDocument()
  })

  it('clears the search from the box', async () => {
    const user = userEvent.setup()
    const { clearSearch } = renderSection({ search: 'استخر' })

    await user.click(screen.getByRole('button', { name: 'پاک کردن جستجو' }))
    expect(clearSearch).toHaveBeenCalled()
  })

  it('preserves the amenity and day filters beside the search box', async () => {
    const user = userEvent.setup()
    const { setAmenity, setDate } = renderSection()

    await user.selectOptions(screen.getByRole('combobox', { name: 'فیلتر بر اساس امکان' }), '2')
    expect(setAmenity).toHaveBeenCalledWith('2')

    const dayInput = screen.getByLabelText('فیلتر بر اساس روز رزرو')
    await user.type(dayInput, '2026-09-10')
    expect(setDate).toHaveBeenCalled()
  })

  it('summarizes what the current view contains', () => {
    renderSection()

    expect(screen.getByText('رزروهای نمایش‌داده‌شده')).toBeInTheDocument()
    expect(screen.getByText('رزروهای فعال')).toBeInTheDocument()
    expect(screen.getByText('رزروهای لغوشده')).toBeInTheDocument()
  })

  it('shows the loading state before the first log arrives', () => {
    renderSection({ reservations: [], loading: true, summary: { total: 0, active: 0, canceled: 0 } })

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument()
    expect(screen.getByText('در حال دریافت اطلاعات...')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the error and a retry when the first read fails', async () => {
    const user = userEvent.setup()
    const { refresh } = renderSection({ reservations: [], error: 'خطای سرور' })

    expect(screen.getByText('خطای سرور')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'تلاش مجدد' }))
    expect(refresh).toHaveBeenCalled()
  })

  it('keeps the table visible when a later read fails, and says the rows are stale', () => {
    renderSection({ error: 'خطای سرور' })

    expect(
      screen.getByText('خطای سرور نتایج قبلی همچنان نمایش داده می‌شوند.'),
    ).toBeInTheDocument()
    expect(table().getByText('استخر')).toBeInTheDocument()
  })

  it('reports a broken amenity dropdown without hiding the report', () => {
    renderSection({ amenitiesError: 'امکانات در دسترس نیست' })

    expect(
      screen.getByText('امکانات در دسترس نیست فیلتر امکان در دسترس نیست؛ جستجوی متنی همچنان کار می‌کند.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('tells an empty log apart from a search that matched nothing', async () => {
    const user = userEvent.setup()
    const { clearFilters } = renderSection({
      reservations: [],
      search: 'اسکی',
      hasFilters: true,
      summary: { total: 0, active: 0, canceled: 0 },
    })

    expect(screen.getByText('رزروی با این فیلترها پیدا نشد')).toBeInTheDocument()
    expect(screen.queryByText('هنوز رزروی ثبت نشده است')).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /حذف همه فیلترها/ })[0])
    expect(clearFilters).toHaveBeenCalled()
  })

  it('explains an empty log when nothing has ever been booked', () => {
    renderSection({ reservations: [], summary: { total: 0, active: 0, canceled: 0 } })

    expect(screen.getByText('هنوز رزروی ثبت نشده است')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /حذف همه فیلترها/ })).not.toBeInTheDocument()
  })

  it('re-reads the log from the refresh button', async () => {
    const user = userEvent.setup()
    const { refresh } = renderSection()

    await user.click(screen.getByRole('button', { name: /به‌روزرسانی/ }))
    expect(refresh).toHaveBeenCalled()
  })

  it('falls back to a dash rather than a blank cell for a missing value', () => {
    renderSection({
      reservations: [
        { id: 5, amenity_name: '', resident_name: '', start_time: null, end_time: null, status: 'Active', created_at: null },
      ],
      summary: { total: 1, active: 1, canceled: 0 },
    })

    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('—')
    expect(cells[1]).toHaveTextContent('—')
    expect(cells[2]).toHaveTextContent('—')
    expect(cells[5]).toHaveTextContent('—')
  })
})
