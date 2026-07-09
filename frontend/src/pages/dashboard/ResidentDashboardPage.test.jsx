import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ToastProvider'
import { unitApi } from '../../lib/unitApi'
import { ResidentDashboardPage } from './ResidentDashboardPage'

vi.mock('../../lib/unitApi', () => ({
  unitApi: {
    myUnit: vi.fn(),
  },
}))

const sampleUnit = { id: 1, unit_number: '102', floor: 1, area: '85.00', building: 1, details: '' }

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
  })

  it('renders the resident profile info from auth state', () => {
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    renderPage()

    expect(screen.getByRole('heading', { name: 'پنل ساکن' })).toBeInTheDocument()
    expect(screen.getByText('علی محمدزاده')).toBeInTheDocument()
    expect(screen.getByText('09120000000')).toBeInTheDocument()
    expect(screen.getByText('ساکن')).toBeInTheDocument()
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
})
