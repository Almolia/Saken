import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/ToastProvider'
import { useManagerCharges } from '../../../hooks/useManagerCharges'
import { managerChargeApi } from '../../../lib/billingApi'
import { FinancialsSection } from './FinancialsSection'

vi.mock('../../../hooks/useManagerCharges', () => ({
  useManagerCharges: vi.fn(),
}))

vi.mock('../../../lib/billingApi', () => ({
  managerChargeApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}))

const sampleCharges = [
  {
    id: 1,
    title: 'شارژ ماهانه شهریور ۱۴۰۵',
    description: 'نظافت راهروها و سرویس آسانسور',
    amount: '500000.00',
    due_date: '2026-09-20',
    apply_to_all: true,
    created_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 2,
    title: 'تعمیر درب پارکینگ',
    description: 'تعویض جک هیدرولیک',
    amount: '200000.00',
    due_date: '2026-09-25',
    apply_to_all: false,
    units_count: 4,
    created_at: '2026-08-05T14:30:00Z',
  },
]

const sampleUnits = [
  { id: 1, unit_number: '101', floor: 1, owner: { full_name: 'علی محمدی' } },
  { id: 2, unit_number: '102', floor: 1, owner: { full_name: 'سارا احمدی' } },
]

function renderSection(charges = sampleCharges, overrides = {}) {
  const refresh = vi.fn()
  const addCharge = vi.fn()
  useManagerCharges.mockReturnValue({
    charges,
    loading: false,
    refreshing: false,
    error: '',
    refresh,
    addCharge,
    ...overrides,
  })

  render(
    <ToastProvider>
      <FinancialsSection units={sampleUnits} />
    </ToastProvider>,
  )

  return { refresh, addCharge }
}

describe('FinancialsSection', () => {
  beforeEach(() => {
    useManagerCharges.mockReset()
    managerChargeApi.create.mockReset()
  })

  it('renders summary cards with total charges count and latest amount', () => {
    renderSection(sampleCharges)

    expect(screen.getByText('کل شارژهای صادرشده')).toBeInTheDocument()
    expect(screen.getByText('شارژهای عمومی (تمام واحدها)')).toBeInTheDocument()
    expect(screen.getByText('آخرین مبلغ مصوب')).toBeInTheDocument()
  })

  it('renders a data table of historically issued charges with title, amount and due date', () => {
    renderSection(sampleCharges)

    const table = screen.getByRole('table')
    expect(within(table).getByText('شارژ ماهانه شهریور ۱۴۰۵')).toBeInTheDocument()
    expect(within(table).getByText('500,000 تومان')).toBeInTheDocument()
    expect(within(table).getByText('تعمیر درب پارکینگ')).toBeInTheDocument()
    expect(within(table).getByText('200,000 تومان')).toBeInTheDocument()

    expect(within(table).getByText('تمام واحدها')).toBeInTheDocument()
    expect(within(table).getByText('4 واحد انتخابی')).toBeInTheDocument()
  })

  it('shows an empty state when no charges have been issued yet', () => {
    renderSection([])

    expect(screen.getByText('هنوز شارژی صادر نشده است')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /صدور اولین شارژ/ })).toBeInTheDocument()
  })

  it('opens the issue new charge modal on clicking the action button', async () => {
    const user = userEvent.setup()
    renderSection(sampleCharges)

    await user.click(screen.getByRole('button', { name: /صدور شارژ جدید/ }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('عنوان شارژ')).toBeInTheDocument()
  })

  it('updates the React state dynamically after creating a new charge', async () => {
    const user = userEvent.setup()
    const newCharge = {
      id: 3,
      title: 'شارژ نظافت اضطراری',
      description: 'هزینه شستشوی مشاعات',
      amount: '150000.00',
      due_date: '2026-09-15',
      apply_to_all: true,
    }

    managerChargeApi.create.mockResolvedValue({
      message: 'شارژ جدید با موفقیت صادر شد.',
      charge: newCharge,
    })

    const { addCharge } = renderSection(sampleCharges)

    await user.click(screen.getByRole('button', { name: /صدور شارژ جدید/ }))

    await user.type(screen.getByLabelText('عنوان شارژ'), 'شارژ نظافت اضطراری')
    await user.type(screen.getByLabelText(/توضیحات شارژ/), 'هزینه شستشوی مشاعات')
    await user.type(screen.getByLabelText('مبلغ هر واحد (تومان)'), '150000')
    await user.type(screen.getByLabelText('مهلت پرداخت'), '2026-09-15')

    await user.click(screen.getByRole('button', { name: /^صدور شارژ$/ }))

    await waitFor(() =>
      expect(managerChargeApi.create).toHaveBeenCalledWith({
        title: 'شارژ نظافت اضطراری',
        description: 'هزینه شستشوی مشاعات',
        amount: '150000.00',
        due_date: '2026-09-15',
        apply_to_all: true,
      }),
    )

    expect(addCharge).toHaveBeenCalledWith(newCharge)
  })

  it('triggers refresh when clicking the refresh button', async () => {
    const user = userEvent.setup()
    const { refresh } = renderSection(sampleCharges)

    await user.click(screen.getByRole('button', { name: /به‌روزرسانی/ }))

    expect(refresh).toHaveBeenCalled()
  })
})
