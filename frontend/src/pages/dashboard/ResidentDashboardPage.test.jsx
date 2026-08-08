import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ToastProvider'
import { residentChargeApi } from '../../lib/billingApi'
import { unitApi } from '../../lib/unitApi'
import { ResidentDashboardPage } from './ResidentDashboardPage'

vi.mock('../../lib/unitApi', () => ({
  unitApi: {
    myUnit: vi.fn(),
  },
}))

vi.mock('../../lib/billingApi', () => ({
  residentChargeApi: {
    pending: vi.fn(),
    pay: vi.fn(),
  },
}))

vi.mock('../../hooks/useServiceRequests', () => ({
  useServiceRequests: () => ({
    requests: [],
    loading: false,
    refreshing: false,
    error: '',
    refresh: vi.fn(),
    addRequest: vi.fn(),
  }),
}))

const sampleUnit = {
  id: 1,
  unit_number: '102',
  floor: 1,
  area: '85.00',
  building: 1,
  details: '',
  unit_debt: '0.00',
}

const authState = {
  loading: false,
  user: { id: 7, full_name: 'علی محمدزاده', phone: '09120000000', role: 'resident' },
}

// Amounts repeat across the debt card, the charge cards and the modal, so the
// money assertions below are always scoped to one of these regions.
const chargesSection = () => within(screen.getByRole('region', { name: 'شارژهای پرداخت‌نشده' }))
const debtSection = () => within(screen.getByRole('region', { name: 'خلاصه بدهی' }))

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ResidentDashboardPage authState={authState} setAuthState={() => {}} />
      </ToastProvider>
    </MemoryRouter>,
  )
}

const septemberCharge = {
  id: 1,
  title: 'شارژ شهریور',
  description: 'نظافت مشاعات',
  amount: '500000.00',
  due_date: '2026-09-20',
  status: 'Pending',
}

const octoberCharge = {
  id: 2,
  title: 'شارژ مهر',
  description: '',
  amount: '250000.00',
  due_date: '2026-10-20',
  status: 'Pending',
}

describe('ResidentDashboardPage', () => {
  beforeEach(() => {
    unitApi.myUnit.mockReset()
    residentChargeApi.pending.mockReset()
    residentChargeApi.pay.mockReset()
    residentChargeApi.pending.mockResolvedValue({ charges: [] })
  })

  it('renders the resident profile info from auth state', async () => {
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    renderPage()

    expect(screen.getByRole('heading', { name: 'پنل ساکن' })).toBeInTheDocument()
    expect(screen.getByText('علی محمدزاده')).toBeInTheDocument()
    expect(screen.getByText('09120000000')).toBeInTheDocument()
    expect(screen.getByText('ساکن')).toBeInTheDocument()
    await screen.findByText('102')
  })

  it('shows the unit loading state first, then the unit details', async () => {
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    renderPage()

    expect(screen.getByRole('status', { name: 'در حال بارگذاری اطلاعات واحد' })).toBeInTheDocument()

    expect(await screen.findByText('102')).toBeInTheDocument()
    expect(screen.getByText('85 متر مربع')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'در حال بارگذاری اطلاعات واحد' })).not.toBeInTheDocument()
  })

  it('shows the error UI when the server fails', async () => {
    unitApi.myUnit.mockRejectedValue(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
    renderPage()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('دریافت اطلاعات واحد ناموفق بود')).toBeInTheDocument()
    expect(screen.getByText('خطایی در ارتباط با سرور رخ داد.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /تلاش مجدد/ })).toBeInTheDocument()
  })

  it('shows the no-unit message when the server returns 404', async () => {
    unitApi.myUnit.mockRejectedValue(Object.assign(new Error('No unit assigned to this user.'), { status: 404 }))
    renderPage()

    expect(await screen.findByText(/هنوز واحدی برای شما ثبت نشده است/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the friendly empty state when there are no pending charges', async () => {
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    residentChargeApi.pending.mockResolvedValue({ charges: [] })
    renderPage()

    expect(await screen.findByText(/شارژ پرداخت‌نشده‌ای ندارید/)).toBeInTheDocument()
  })

  it('renders pending charges with title, amount and due date', async () => {
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    residentChargeApi.pending.mockResolvedValue({
      charges: [
        {
          id: 1,
          title: 'شارژ شهریور',
          description: 'نظافت مشاعات',
          amount: '500000.00',
          due_date: '2026-09-20',
          status: 'Pending',
        },
      ],
    })
    renderPage()

    expect(await screen.findByText('شارژ شهریور')).toBeInTheDocument()
    expect(screen.getByText('نظافت مشاعات')).toBeInTheDocument()
    expect(screen.getByText('500,000 تومان')).toBeInTheDocument()
    expect(screen.getByText('در انتظار پرداخت')).toBeInTheDocument()
  })

  it('shows the total debt summary as green when the balance is zero', async () => {
    unitApi.myUnit.mockResolvedValue(sampleUnit) // unit_debt = '0.00'
    renderPage()

    expect(await screen.findByText('مجموع بدهی واحد شما')).toBeInTheDocument()
    expect(screen.getByText('مبلغی پرداخت‌نشده ندارید')).toBeInTheDocument()
  })

  it('shows the total debt summary in red when there is an outstanding balance', async () => {
    unitApi.myUnit.mockResolvedValue({ ...sampleUnit, unit_debt: '1250000.00' })
    renderPage()

    expect(await screen.findByText('مجموع بدهی واحد شما')).toBeInTheDocument()
    expect(screen.getByText('بدهی پرداخت‌نشده دارید')).toBeInTheDocument()
    expect(screen.getByText('1,250,000 تومان')).toBeInTheDocument()
  })

  it('keeps the pay button disabled until a charge is selected, then totals the selection', async () => {
    const user = userEvent.setup()
    unitApi.myUnit.mockResolvedValue({ ...sampleUnit, unit_debt: '750000.00' })
    residentChargeApi.pending.mockResolvedValue({ charges: [septemberCharge, octoberCharge] })
    renderPage()

    await screen.findByText('شارژ شهریور')
    const payButton = screen.getByRole('button', { name: /پرداخت انتخاب‌شده‌ها/ })
    expect(payButton).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: 'انتخاب شارژ شهریور' }))
    expect(payButton).toBeEnabled()
    expect(screen.getByText('1 صورت‌حساب انتخاب شده است')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'انتخاب شارژ مهر' }))
    expect(screen.getByText('2 صورت‌حساب انتخاب شده است')).toBeInTheDocument()
    expect(chargesSection().getByText('750,000 تومان')).toBeInTheDocument()
  })

  it('selects every charge at once with the select-all checkbox', async () => {
    const user = userEvent.setup()
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    residentChargeApi.pending.mockResolvedValue({ charges: [septemberCharge, octoberCharge] })
    renderPage()

    await screen.findByText('شارژ شهریور')
    await user.click(screen.getByRole('checkbox', { name: 'انتخاب همه' }))

    expect(screen.getByRole('checkbox', { name: 'انتخاب شارژ شهریور' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'انتخاب شارژ مهر' })).toBeChecked()
    expect(screen.getByText('2 صورت‌حساب انتخاب شده است')).toBeInTheDocument()
  })

  it('pays the selected charges, drops them from the list and refreshes the debt total', async () => {
    const user = userEvent.setup()
    unitApi.myUnit
      .mockResolvedValueOnce({ ...sampleUnit, unit_debt: '750000.00' })
      .mockResolvedValueOnce({ ...sampleUnit, unit_debt: '250000.00' })
    residentChargeApi.pending.mockResolvedValue({ charges: [septemberCharge, octoberCharge] })
    residentChargeApi.pay.mockResolvedValue({ message: 'پرداخت با موفقیت انجام شد.' })
    renderPage()

    await screen.findByText('شارژ شهریور')
    await user.click(screen.getByRole('checkbox', { name: 'انتخاب شارژ شهریور' }))
    await user.click(screen.getByRole('button', { name: /پرداخت انتخاب‌شده‌ها/ }))

    // The simulated gateway opens with the selection itemized inside it.
    const dialog = await screen.findByRole('dialog', { name: 'پرداخت شارژ' })
    expect(dialog).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /تأیید و پرداخت/ }))

    expect(residentChargeApi.pay).toHaveBeenCalledWith([1])
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Paid charge is gone, the unpaid one stays.
    expect(chargesSection().queryByText('شارژ شهریور')).not.toBeInTheDocument()
    expect(chargesSection().getByText('شارژ مهر')).toBeInTheDocument()

    // Success toast, and the debt card re-read from the server.
    expect(await screen.findByText('پرداخت با موفقیت انجام شد.')).toBeInTheDocument()
    await waitFor(() => expect(debtSection().getByText('250,000 تومان')).toBeInTheDocument())
  })

  it('keeps the charges on screen and surfaces the error when payment fails', async () => {
    const user = userEvent.setup()
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    residentChargeApi.pending.mockResolvedValue({ charges: [septemberCharge] })
    residentChargeApi.pay.mockRejectedValue(
      Object.assign(new Error('برخی از شارژهای انتخاب‌شده قبلاً پرداخت شده‌اند.'), { status: 400 }),
    )
    renderPage()

    await screen.findByText('شارژ شهریور')
    await user.click(screen.getByRole('checkbox', { name: 'انتخاب شارژ شهریور' }))
    await user.click(screen.getByRole('button', { name: /پرداخت انتخاب‌شده‌ها/ }))
    await user.click(await screen.findByRole('button', { name: /تأیید و پرداخت/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'برخی از شارژهای انتخاب‌شده قبلاً پرداخت شده‌اند.',
    )
    expect(chargesSection().getByText('شارژ شهریور')).toBeInTheDocument()
  })
})
