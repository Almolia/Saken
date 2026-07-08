import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ToastProvider'
import { ResidentDashboardPage } from './ResidentDashboardPage'

vi.mock('../../lib/unitApi', () => ({
  unitApi: {
    myUnit: vi.fn().mockResolvedValue({ id: 1, unit_number: '102', floor: 1, area: '85.00', building: 1, details: '' }),
  },
}))

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
  it('renders the resident profile info from auth state', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'پنل ساکن' })).toBeInTheDocument()
    expect(screen.getByText('علی محمدزاده')).toBeInTheDocument()
    expect(screen.getByText('09120000000')).toBeInTheDocument()
    expect(screen.getByText('ساکن')).toBeInTheDocument()
  })

  it('shows the unit loading state first, then the unit details', async () => {
    renderPage()

    expect(screen.getByRole('status', { name: 'در حال بارگذاری اطلاعات واحد' })).toBeInTheDocument()

    expect(await screen.findByText('102')).toBeInTheDocument()
    expect(screen.getByText('85 متر مربع')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'در حال بارگذاری اطلاعات واحد' })).not.toBeInTheDocument()
  })
})
