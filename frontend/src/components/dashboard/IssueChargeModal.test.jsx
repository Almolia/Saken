import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { managerChargeApi } from '../../lib/billingApi'
import { managerApi } from '../../lib/api'
import { IssueChargeModal } from './IssueChargeModal'

vi.mock('../../lib/billingApi', () => ({
  managerChargeApi: {
    create: vi.fn(),
  },
}))

vi.mock('../../lib/api', () => ({
  managerApi: {
    units: vi.fn(),
  },
}))

const sampleUnits = [
  { id: 1, unit_number: '101', floor: 1, owner: { full_name: 'علی محمدی' } },
  { id: 2, unit_number: '102', floor: 1, owner: { full_name: 'سارا احمدی' } },
  { id: 3, unit_number: '201', floor: 2, owner: null },
]

function renderModal(props = {}) {
  const onClose = vi.fn()
  const onChargeIssued = vi.fn()
  render(
    <ToastProvider>
      <IssueChargeModal
        open
        onClose={onClose}
        onChargeIssued={onChargeIssued}
        units={sampleUnits}
        {...props}
      />
    </ToastProvider>,
  )
  return { onClose, onChargeIssued }
}

describe('IssueChargeModal', () => {
  beforeEach(() => {
    managerChargeApi.create.mockReset()
    managerApi.units.mockReset()
  })

  it('renders title, description, amount, due date and scope options', () => {
    renderModal()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('عنوان شارژ')).toBeInTheDocument()
    expect(screen.getByLabelText(/توضیحات شارژ/)).toBeInTheDocument()
    expect(screen.getByLabelText('مبلغ هر واحد (تومان)')).toBeInTheDocument()
    expect(screen.getByLabelText('مهلت پرداخت')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /تمام واحدها/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /واحدهای انتخابی/ })).not.toBeChecked()
  })

  it('validates required fields client-side before calling the API', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: /صدور شارژ/ }))

    expect(screen.getByText('عنوان شارژ الزامی است.')).toBeInTheDocument()
    expect(screen.getByText('مبلغ به ازای هر واحد الزامی است.')).toBeInTheDocument()
    expect(screen.getByText('مهلت پرداخت الزامی است.')).toBeInTheDocument()
    expect(managerChargeApi.create).not.toHaveBeenCalled()
  })

  it('rejects zero or negative amount', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('عنوان شارژ'), 'شارژ شهریور')
    await user.type(screen.getByLabelText('مبلغ هر واحد (تومان)'), '-500')
    await user.type(screen.getByLabelText('مهلت پرداخت'), '2026-09-20')
    await user.click(screen.getByRole('button', { name: /صدور شارژ/ }))

    expect(screen.getByText('مبلغ شارژ باید یک عدد بزرگ‌تر از صفر باشد.')).toBeInTheDocument()
    expect(managerChargeApi.create).not.toHaveBeenCalled()
  })

  it('validates unit selection when "Select Specific Units" is chosen and none selected', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('عنوان شارژ'), 'شارژ تعمیر پارکینگ')
    await user.type(screen.getByLabelText('مبلغ هر واحد (تومان)'), '300000')
    await user.type(screen.getByLabelText('مهلت پرداخت'), '2026-09-25')

    // Switch to specific units
    await user.click(screen.getByRole('radio', { name: /واحدهای انتخابی/ }))

    await user.click(screen.getByRole('button', { name: /صدور شارژ/ }))

    expect(screen.getByText('حداقل یک واحد باید انتخاب شود.')).toBeInTheDocument()
    expect(managerChargeApi.create).not.toHaveBeenCalled()
  })

  it('allows selecting specific units and submitting successfully', async () => {
    const user = userEvent.setup()
    const newCharge = {
      id: 10,
      title: 'شارژ تعمیر پارکینگ',
      description: 'هزینه درب اتوماتیک',
      amount: '300000.00',
      due_date: '2026-09-25',
      apply_to_all: false,
      unit_ids: [1, 2],
    }

    managerChargeApi.create.mockResolvedValue({
      message: 'شارژ جدید با موفقیت صادر شد.',
      charge: newCharge,
    })

    const { onChargeIssued, onClose } = renderModal()

    await user.type(screen.getByLabelText('عنوان شارژ'), 'شارژ تعمیر پارکینگ')
    await user.type(screen.getByLabelText(/توضیحات شارژ/), 'هزینه درب اتوماتیک')
    await user.type(screen.getByLabelText('مبلغ هر واحد (تومان)'), '300000')
    await user.type(screen.getByLabelText('مهلت پرداخت'), '2026-09-25')

    await user.click(screen.getByRole('radio', { name: /واحدهای انتخابی/ }))

    // Click unit 1 and unit 2 checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    await user.click(screen.getByRole('button', { name: /صدور شارژ/ }))

    await waitFor(() =>
      expect(managerChargeApi.create).toHaveBeenCalledWith({
        title: 'شارژ تعمیر پارکینگ',
        description: 'هزینه درب اتوماتیک',
        amount: '300000.00',
        due_date: '2026-09-25',
        apply_to_all: false,
        unit_ids: [1, 2],
      }),
    )

    expect(onChargeIssued).toHaveBeenCalledWith(newCharge)
    expect(onClose).toHaveBeenCalled()
    expect(await screen.findByText('شارژ جدید با موفقیت صادر شد.')).toBeInTheDocument()
  })

  it('submits successfully for all units', async () => {
    const user = userEvent.setup()
    const newCharge = {
      id: 11,
      title: 'شارژ ماهانه شهریور',
      description: 'نظافت و نگهداری',
      amount: '500000.00',
      due_date: '2026-09-20',
      apply_to_all: true,
    }

    managerChargeApi.create.mockResolvedValue({
      message: 'شارژ جدید با موفقیت صادر شد.',
      charge: newCharge,
    })

    const { onChargeIssued, onClose } = renderModal()

    await user.type(screen.getByLabelText('عنوان شارژ'), 'شارژ ماهانه شهریور')
    await user.type(screen.getByLabelText(/توضیحات شارژ/), 'نظافت و نگهداری')
    await user.type(screen.getByLabelText('مبلغ هر واحد (تومان)'), '500000')
    await user.type(screen.getByLabelText('مهلت پرداخت'), '2026-09-20')

    await user.click(screen.getByRole('button', { name: /صدور شارژ/ }))

    await waitFor(() =>
      expect(managerChargeApi.create).toHaveBeenCalledWith({
        title: 'شارژ ماهانه شهریور',
        description: 'نظافت و نگهداری',
        amount: '500000.00',
        due_date: '2026-09-20',
        apply_to_all: true,
      }),
    )

    expect(onChargeIssued).toHaveBeenCalledWith(newCharge)
    expect(onClose).toHaveBeenCalled()
  })

  it('surfaces a server rejection without closing the modal', async () => {
    const user = userEvent.setup()
    managerChargeApi.create.mockRejectedValue(new Error('خطایی در سرور رخ داد.'))
    const { onChargeIssued, onClose } = renderModal()

    await user.type(screen.getByLabelText('عنوان شارژ'), 'شارژ ماهانه')
    await user.type(screen.getByLabelText('مبلغ هر واحد (تومان)'), '200000')
    await user.type(screen.getByLabelText('مهلت پرداخت'), '2026-09-20')
    await user.click(screen.getByRole('button', { name: /صدور شارژ/ }))

    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('خطایی در سرور رخ داد.')).toBeInTheDocument()
    expect(onChargeIssued).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders nothing when open is false', () => {
    const { container } = render(
      <ToastProvider>
        <IssueChargeModal open={false} onClose={vi.fn()} onChargeIssued={vi.fn()} />
      </ToastProvider>,
    )

    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})
