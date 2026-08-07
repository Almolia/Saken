import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ResidentDashboardPage authState={authState} setAuthState={() => {}} />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('ResidentDashboardPage', () => {
  beforeEach(() => {
    unitApi.myUnit.mockReset()
    residentChargeApi.pending.mockReset()
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
})
