import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { amenityApi } from '../../lib/amenityApi'
import { MyReservationsSection } from './MyReservationsSection'

vi.mock('../../lib/amenityApi', () => ({
  amenityApi: {
    cancelReservation: vi.fn(),
  },
}))

const HOUR = 60 * 60 * 1000

function isoOffset(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * HOUR).toISOString()
}

// One booking per rendered state, all positioned relative to the current time
// so the categorisation never depends on a fixed clock.
const upcomingReservation = {
  id: 1,
  amenity: 1,
  amenity_name: 'باشگاه ورزشی',
  start_time: isoOffset(24),
  end_time: isoOffset(25),
  status: 'Active',
}

const runningReservation = {
  id: 2,
  amenity: 2,
  amenity_name: 'سالن اجتماعات',
  start_time: isoOffset(-0.5),
  end_time: isoOffset(0.5),
  status: 'Active',
}

const pastReservation = {
  id: 3,
  amenity: 3,
  amenity_name: 'زمین تنیس',
  start_time: isoOffset(-48),
  end_time: isoOffset(-47),
  status: 'Active',
}

const canceledReservation = {
  id: 4,
  amenity: 1,
  amenity_name: 'استخر',
  start_time: isoOffset(72),
  end_time: isoOffset(73),
  status: 'Canceled',
}

const allReservations = [upcomingReservation, runningReservation, pastReservation, canceledReservation]

function renderSection(props = {}) {
  const onCanceled = props.onCanceled || vi.fn()
  const utils = render(
    <ToastProvider>
      <MyReservationsSection
        reservations={allReservations}
        loading={false}
        refreshing={false}
        error=""
        onRetry={vi.fn()}
        {...props}
        onCanceled={onCanceled}
      />
    </ToastProvider>,
  )
  return { ...utils, onCanceled }
}

const tab = (name) => screen.getByRole('tab', { name: new RegExp(name) })
const panel = () => within(screen.getByRole('tabpanel'))

describe('MyReservationsSection', () => {
  beforeEach(() => {
    amenityApi.cancelReservation.mockReset()
  })

  it('renders the three categories with their counts', () => {
    renderSection()

    expect(screen.getByRole('heading', { name: 'رزروهای من' })).toBeInTheDocument()
    // Upcoming holds the future booking plus the one running right now.
    expect(tab('پیش‌رو')).toHaveTextContent('2')
    expect(tab('گذشته')).toHaveTextContent('1')
    expect(tab('لغوشده')).toHaveTextContent('1')
  })

  it('opens on the upcoming bookings and marks the one already in progress', () => {
    renderSection()

    expect(tab('پیش‌رو')).toHaveAttribute('aria-selected', 'true')
    expect(panel().getByText('باشگاه ورزشی')).toBeInTheDocument()
    expect(panel().getByText('سالن اجتماعات')).toBeInTheDocument()
    expect(panel().queryByText('زمین تنیس')).not.toBeInTheDocument()
    expect(panel().queryByText('استخر')).not.toBeInTheDocument()

    expect(panel().getByText('پیش‌رو')).toBeInTheDocument()
    expect(panel().getByText('در حال استفاده')).toBeInTheDocument()
  })

  it('shows past bookings only under the past tab', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(tab('گذشته'))

    expect(panel().getByText('زمین تنیس')).toBeInTheDocument()
    expect(panel().getByText('برگزار شده')).toBeInTheDocument()
    expect(panel().queryByText('باشگاه ورزشی')).not.toBeInTheDocument()
  })

  it('shows canceled bookings only under the canceled tab', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(tab('لغوشده'))

    expect(panel().getByText('استخر')).toBeInTheDocument()
    expect(panel().getByText('لغو شده')).toBeInTheDocument()
    expect(panel().queryByText('باشگاه ورزشی')).not.toBeInTheDocument()
  })

  it('offers the cancel button only for bookings that have not started yet', async () => {
    const user = userEvent.setup()
    renderSection()

    expect(panel().getByRole('button', { name: 'لغو رزرو باشگاه ورزشی' })).toBeInTheDocument()
    expect(panel().queryByRole('button', { name: 'لغو رزرو سالن اجتماعات' })).not.toBeInTheDocument()

    await user.click(tab('گذشته'))
    expect(panel().queryByRole('button', { name: /لغو رزرو/ })).not.toBeInTheDocument()

    await user.click(tab('لغوشده'))
    expect(panel().queryByRole('button', { name: /لغو رزرو/ })).not.toBeInTheDocument()
  })

  it('asks for confirmation before calling the API', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(panel().getByRole('button', { name: 'لغو رزرو باشگاه ورزشی' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'لغو رزرو' }))
    expect(dialog.getByText('آیا از لغو این رزرو اطمینان دارید؟')).toBeInTheDocument()
    expect(dialog.getByText('باشگاه ورزشی')).toBeInTheDocument()
    expect(amenityApi.cancelReservation).not.toHaveBeenCalled()

    await user.click(dialog.getByRole('button', { name: 'انصراف' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(amenityApi.cancelReservation).not.toHaveBeenCalled()
  })

  it('cancels the booking, reports it back and shows a success toast', async () => {
    const user = userEvent.setup()
    const canceled = { ...upcomingReservation, status: 'Canceled' }
    amenityApi.cancelReservation.mockResolvedValue({
      message: 'رزرو با موفقیت لغو شد.',
      reservation: canceled,
    })
    const { onCanceled } = renderSection()

    await user.click(panel().getByRole('button', { name: 'لغو رزرو باشگاه ورزشی' }))
    await user.click(screen.getByRole('button', { name: 'بله، رزرو لغو شود' }))

    expect(amenityApi.cancelReservation).toHaveBeenCalledWith(1)
    await waitFor(() => expect(onCanceled).toHaveBeenCalledWith(1, canceled))
    expect(await screen.findByText('رزرو با موفقیت لغو شد.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps the confirmation open and surfaces the reason when the server refuses', async () => {
    const user = userEvent.setup()
    amenityApi.cancelReservation.mockRejectedValue(
      Object.assign(new Error('امکان لغو رزروهای گذشته وجود ندارد.'), { status: 400 }),
    )
    const { onCanceled } = renderSection()

    await user.click(panel().getByRole('button', { name: 'لغو رزرو باشگاه ورزشی' }))
    await user.click(screen.getByRole('button', { name: 'بله، رزرو لغو شود' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('امکان لغو رزروهای گذشته وجود ندارد.')
    expect(screen.getByRole('dialog', { name: 'لغو رزرو' })).toBeInTheDocument()
    expect(onCanceled).not.toHaveBeenCalled()
  })

  it('shows a per-tab empty state when a category has no bookings', async () => {
    const user = userEvent.setup()
    renderSection({ reservations: [] })

    expect(screen.getByText('رزرو پیش‌رویی ندارید')).toBeInTheDocument()

    await user.click(tab('گذشته'))
    expect(screen.getByText('هنوز رزرو گذشته‌ای ندارید')).toBeInTheDocument()

    await user.click(tab('لغوشده'))
    expect(screen.getByText('رزرو لغوشده‌ای ندارید')).toBeInTheDocument()
  })

  it('shows the loading state and the retryable error state', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const { rerender } = renderSection({ loading: true })

    expect(screen.getByRole('status', { name: 'در حال بارگذاری رزروها' })).toBeInTheDocument()

    rerender(
      <ToastProvider>
        <MyReservationsSection
          reservations={[]}
          loading={false}
          refreshing={false}
          error="خطایی در دریافت رزروهای شما رخ داد."
          onRetry={onRetry}
          onCanceled={vi.fn()}
        />
      </ToastProvider>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('خطایی در دریافت رزروهای شما رخ داد.')
    await user.click(screen.getByRole('button', { name: 'تلاش مجدد' }))
    expect(onRetry).toHaveBeenCalled()
  })
})
