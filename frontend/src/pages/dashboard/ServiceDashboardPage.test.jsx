import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ToastProvider'
import { authApi } from '../../lib/api'
import { ServiceDashboardPage } from './ServiceDashboardPage'

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

const authState = {
  loading: false,
  user: { id: 12, full_name: 'متین محمودی', phone: '09120000001', role: 'service_staff' },
}

function renderPage(setAuthState = vi.fn()) {
  render(
    <MemoryRouter>
      <ToastProvider>
        <ServiceDashboardPage authState={authState} setAuthState={setAuthState} />
      </ToastProvider>
    </MemoryRouter>,
  )
  return { setAuthState }
}

describe('ServiceDashboardPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    authApi.logout.mockReset()
  })

  it('renders the service staff shell with the placeholder message', () => {
    renderPage()

    expect(screen.getByText('پنل کارکنان خدمات')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'وظایف من' })).toBeInTheDocument()
    expect(screen.getByText('خوش آمدید، متین محمودی')).toBeInTheDocument()
    expect(screen.getByText('این بخش به‌زودی فعال می‌شود')).toBeInTheDocument()
  })

  it('switches to the account section and shows the user details', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getAllByRole('button', { name: 'حساب کاربری' })[0])

    // The name and role also render in the sidebar profile card, so scope to the content area.
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('heading', { name: 'حساب کاربری' })).toBeInTheDocument()
    expect(main.getByText('متین محمودی')).toBeInTheDocument()
    expect(main.getByText('09120000001')).toBeInTheDocument()
    expect(main.getByText('کارکنان خدمات')).toBeInTheDocument()
  })

  it('logs the user out and redirects to the login page', async () => {
    const user = userEvent.setup()
    authApi.logout.mockResolvedValue({})
    const { setAuthState } = renderPage()

    await user.click(screen.getAllByRole('button', { name: /خروج/ })[0])

    await waitFor(() => expect(authApi.logout).toHaveBeenCalledTimes(1))
    expect(setAuthState).toHaveBeenCalledWith({ loading: false, user: null })
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
    expect(await screen.findByText('از حساب خارج شدید.')).toBeInTheDocument()
  })

  it('keeps the session and reports the error when logout fails', async () => {
    const user = userEvent.setup()
    authApi.logout.mockRejectedValue(new Error('ارتباط با سرور برقرار نشد.'))
    const { setAuthState } = renderPage()

    await user.click(screen.getAllByRole('button', { name: /خروج/ })[0])

    expect(await screen.findByText('ارتباط با سرور برقرار نشد.')).toBeInTheDocument()
    expect(setAuthState).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
