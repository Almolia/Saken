import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { amenityApi } from '../../lib/amenityApi'
import { AmenityBookingSection } from './AmenityBookingSection'

vi.mock('../../lib/amenityApi', () => ({
  amenityApi: {
    list: vi.fn(),
    getSlots: vi.fn(),
    createReservation: vi.fn(),
  },
}))

const sampleAmenities = [
  {
    id: 1,
    name: 'باشگاه ورزشی',
    description: 'تجهیزات بدنسازی کامل',
    operating_rules: '08:00 تا 22:00',
    is_active: true,
  },
  {
    id: 2,
    name: 'زمین تنیس',
    description: 'زمین روباز',
    operating_rules: '08:00 تا 22:00',
    is_active: true,
  },
]

const sampleSlots = [
  {
    start_time: '2026-08-09T08:00:00+03:30',
    end_time: '2026-08-09T09:00:00+03:30',
    start_time_formatted: '08:00',
    end_time_formatted: '09:00',
    label: '08:00 تا 09:00',
    is_booked: false,
    is_available: true,
  },
  {
    start_time: '2026-08-09T09:00:00+03:30',
    end_time: '2026-08-09T10:00:00+03:30',
    start_time_formatted: '09:00',
    end_time_formatted: '10:00',
    label: '09:00 تا 10:00',
    is_booked: true,
    is_available: false,
  },
]

function renderSection(props = {}) {
  return render(
    <ToastProvider>
      <AmenityBookingSection {...props} />
    </ToastProvider>,
  )
}

describe('AmenityBookingSection', () => {
  beforeEach(() => {
    amenityApi.list.mockReset()
    amenityApi.getSlots.mockReset()
    amenityApi.createReservation.mockReset()

    amenityApi.list.mockResolvedValue({ amenities: sampleAmenities })
    amenityApi.getSlots.mockResolvedValue({ slots: sampleSlots })
  })

  it('renders the section title and loads active amenities', async () => {
    renderSection()

    expect(screen.getByRole('heading', { name: 'امکانات و رزروها' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /باشگاه ورزشی/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /زمین تنیس/ })).toBeInTheDocument()
    expect(screen.getByText(/قوانین و ساعات کاری: 08:00 تا 22:00/)).toBeInTheDocument()
  })

  it('fetches slots for the selected amenity and displays available vs booked slots', async () => {
    renderSection()

    // 08:00 to 09:00 available, 09:00 to 10:00 booked
    const slot08 = await screen.findByRole('button', { name: /08:00.*09:00/ })
    const slot09 = screen.getByRole('button', { name: /09:00.*10:00/ })

    expect(slot08).toBeEnabled()
    expect(within(slot08).getByText('قابل رزرو')).toBeInTheDocument()

    expect(slot09).toBeDisabled()
    expect(within(slot09).getByText('رزرو شده')).toBeInTheDocument()
  })

  it('allows clicking an available slot and submitting the booking', async () => {
    const user = userEvent.setup()
    amenityApi.createReservation.mockResolvedValue({
      message: 'رزرو با موفقیت انجام شد.',
      reservation: { id: 10, amenity: 1, start_time: '2026-08-09T08:00:00+03:30', end_time: '2026-08-09T09:00:00+03:30' },
    })

    renderSection()

    const slot08 = await screen.findByRole('button', { name: /08:00.*09:00/ })
    const confirmBtn = screen.getByRole('button', { name: /تأیید و ثبت رزرو/ })

    expect(confirmBtn).toBeDisabled()
    await user.click(slot08)
    expect(confirmBtn).toBeEnabled()

    await user.click(confirmBtn)

    expect(amenityApi.createReservation).toHaveBeenCalledWith({
      amenity: 1,
      start_time: '2026-08-09T08:00:00+03:30',
      end_time: '2026-08-09T09:00:00+03:30',
    })
    expect(await screen.findByText('رزرو با موفقیت انجام شد.')).toBeInTheDocument()
  })

  it('handles booking conflict error when someone books the slot milliseconds earlier', async () => {
    const user = userEvent.setup()
    amenityApi.createReservation.mockRejectedValue(
      Object.assign(new Error('این بازه زمانی قبلاً رزرو شده است.'), { status: 400 }),
    )

    renderSection()

    const slot08 = await screen.findByRole('button', { name: /08:00.*09:00/ })
    await user.click(slot08)

    const confirmBtn = screen.getByRole('button', { name: /تأیید و ثبت رزرو/ })
    await user.click(confirmBtn)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('این بازه زمانی قبلاً رزرو شده است.')
  })

  it('hands the created booking to the reservations list', async () => {
    const user = userEvent.setup()
    const createdReservation = {
      id: 10,
      amenity: 1,
      amenity_name: 'باشگاه ورزشی',
      start_time: '2026-08-09T08:00:00+03:30',
      end_time: '2026-08-09T09:00:00+03:30',
      status: 'Active',
    }
    amenityApi.createReservation.mockResolvedValue({
      message: 'رزرو با موفقیت انجام شد.',
      reservation: createdReservation,
    })
    const onBookingCreated = vi.fn()

    renderSection({ onBookingCreated })

    await user.click(await screen.findByRole('button', { name: /08:00.*09:00/ }))
    await user.click(screen.getByRole('button', { name: /تأیید و ثبت رزرو/ }))

    await waitFor(() => expect(onBookingCreated).toHaveBeenCalledWith(createdReservation))
  })

  it('re-reads the slots when a cancellation frees one', async () => {
    const { rerender } = renderSection({ slotsRefreshToken: 0 })

    await screen.findByRole('button', { name: /08:00.*09:00/ })
    expect(amenityApi.getSlots).toHaveBeenCalledTimes(1)

    rerender(
      <ToastProvider>
        <AmenityBookingSection slotsRefreshToken={1} />
      </ToastProvider>,
    )

    await waitFor(() => expect(amenityApi.getSlots).toHaveBeenCalledTimes(2))
  })
})
