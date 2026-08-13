import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFinancialReports } from '../../../hooks/useFinancialReports'
import { ReportsSection } from './ReportsSection'

vi.mock('../../../hooks/useFinancialReports', () => ({
  useFinancialReports: vi.fn(),
}))

const sampleRecords = [
  {
    id: 1,
    unit_number: '101',
    title: 'شارژ مهرماه',
    description: 'نظافت مشاعات',
    status: 'Paid',
    amount: '100000.00',
    due_date: '2026-10-20',
  },
  {
    id: 2,
    unit_number: '102',
    title: 'شارژ شهریور',
    description: 'تعمیر آسانسور',
    status: 'Pending',
    amount: '150000.00',
    due_date: '2026-09-20',
  },
]

function renderSection(overrides = {}) {
  const refresh = vi.fn()
  const setSearch = vi.fn()
  useFinancialReports.mockReturnValue({
    summary: {
      total_collected_revenue: '100000.00',
      total_outstanding_debt: '150000.00',
    },
    records: sampleRecords,
    filteredRecords: sampleRecords,
    search: '',
    setSearch,
    loading: false,
    refreshing: false,
    error: '',
    refresh,
    ...overrides,
  })

  render(<ReportsSection />)
  return { refresh, setSearch }
}

describe('ReportsSection', () => {
  beforeEach(() => {
    useFinancialReports.mockReset()
  })

  it('renders collected and outstanding summary cards', () => {
    renderSection()

    expect(screen.getByText('کل مبلغ وصول‌شده')).toBeInTheDocument()
    expect(screen.getByText('کل بدهی معوق')).toBeInTheDocument()
    expect(screen.getAllByText('100,000 تومان').length).toBeGreaterThan(0)
    expect(screen.getAllByText('150,000 تومان').length).toBeGreaterThan(0)
  })

  it('renders the financial records table', () => {
    renderSection()

    const table = screen.getByRole('table')
    expect(within(table).getByText('واحد 101')).toBeInTheDocument()
    expect(within(table).getByText('شارژ مهرماه')).toBeInTheDocument()
    expect(within(table).getByText('پرداخت‌شده')).toBeInTheDocument()
    expect(within(table).getByText('پرداخت‌نشده')).toBeInTheDocument()
  })

  it('filters the table as the user types in the unified search bar', async () => {
    const user = userEvent.setup()
    const { setSearch } = renderSection()

    await user.type(screen.getByPlaceholderText(/جستجو بر اساس شماره واحد/), '101')

    expect(setSearch).toHaveBeenCalled()
  })

  it('shows an empty search state when nothing matches', () => {
    renderSection({
      filteredRecords: [],
      search: 'xyz',
    })

    expect(screen.getByText('نتیجه‌ای برای این جستجو پیدا نشد')).toBeInTheDocument()
  })
})
