import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ToastProvider'
import { amenityApi } from '../../lib/amenityApi'
import { residentAnnouncementApi } from '../../lib/announcementApi'
import { authApi } from '../../lib/api'
import { residentChargeApi } from '../../lib/billingApi'
import { unitApi } from '../../lib/unitApi'
import { ResidentDashboardPage } from './ResidentDashboardPage'

vi.mock('../../lib/announcementApi', () => ({
  residentAnnouncementApi: {
    list: vi.fn(),
  },
}))

vi.mock('../../lib/unitApi', () => ({
  unitApi: {
    myUnit: vi.fn(),
  },
}))

vi.mock('../../lib/amenityApi', () => ({
  amenityApi: {
    list: vi.fn(),
    getSlots: vi.fn(),
    createReservation: vi.fn(),
    myReservations: vi.fn(),
    cancelReservation: vi.fn(),
  },
}))

vi.mock('../../lib/billingApi', () => ({
  residentChargeApi: {
    pending: vi.fn(),
    history: vi.fn(),
    pay: vi.fn(),
  },
}))

vi.mock('../../lib/api', () => ({
  authApi: {
    logout: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
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
const reservationsSection = () => within(screen.getByRole('region', { name: 'رزروهای من' }))

const HOUR = 60 * 60 * 1000
const isoOffset = (hoursFromNow) => new Date(Date.now() + hoursFromNow * HOUR).toISOString()

const upcomingReservation = {
  id: 21,
  amenity: 1,
  amenity_name: 'باشگاه ورزشی',
  start_time: isoOffset(24),
  end_time: isoOffset(25),
  status: 'Active',
}

const pastReservation = {
  id: 22,
  amenity: 2,
  amenity_name: 'زمین تنیس',
  start_time: isoOffset(-48),
  end_time: isoOffset(-47),
  status: 'Active',
}

const canceledReservation = {
  id: 23,
  amenity: 3,
  amenity_name: 'سالن اجتماعات',
  start_time: isoOffset(72),
  end_time: isoOffset(73),
  status: 'Canceled',
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
    localStorage.clear()
    authApi.updateProfile.mockReset()
    authApi.changePassword.mockReset()
    residentAnnouncementApi.list.mockReset()
    residentAnnouncementApi.list.mockResolvedValue([])

    unitApi.myUnit.mockReset()
    residentChargeApi.pending.mockReset()
    residentChargeApi.history.mockReset()
    residentChargeApi.pay.mockReset()
    residentChargeApi.pending.mockResolvedValue({ charges: [] })
    residentChargeApi.history.mockResolvedValue({ charges: [], total_paid: '0.00' })

    amenityApi.list.mockReset()
    amenityApi.getSlots.mockReset()
    amenityApi.myReservations.mockReset()
    amenityApi.cancelReservation.mockReset()
    amenityApi.list.mockResolvedValue({ amenities: [] })
    amenityApi.getSlots.mockResolvedValue({ slots: [] })
    amenityApi.myReservations.mockResolvedValue({ reservations: [] })
  })

  it('shows the building announcement feed above the resident\'s own details', async () => {
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    residentAnnouncementApi.list.mockResolvedValue([
      {
        id: 5,
        title: 'قطع آب ساختمان',
        content: 'آب ساختمان فردا از ساعت ۹ تا ۱۲ قطع خواهد بود.',
        author_name: 'مدیر ساختمان',
        created_at: new Date(Date.now() - 3 * HOUR).toISOString(),
      },
    ])
    renderPage()

    const feed = screen.getByRole('region', { name: 'اطلاعیه‌های ساختمان' })
    expect(await within(feed).findByText('قطع آب ساختمان')).toBeInTheDocument()
    expect(within(feed).getByText('۳ ساعت پیش')).toBeInTheDocument()

    // Building-wide news is read before the resident's own unit and charges.
    const charges = screen.getByRole('region', { name: 'شارژهای پرداخت‌نشده' })
    expect(feed.compareDocumentPosition(charges) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('falls back to the empty state when nothing has been published', async () => {
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    renderPage()

    const feed = screen.getByRole('region', { name: 'اطلاعیه‌های ساختمان' })
    expect(await within(feed).findByText('در حال حاضر اطلاعیه‌ای وجود ندارد')).toBeInTheDocument()
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

  it('lists what the resident has already settled, with the total', async () => {
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    residentChargeApi.history.mockResolvedValue({
      charges: [{ ...septemberCharge, status: 'Paid', paid_at: '2026-08-01T10:00:00Z' }],
      total_paid: '500000.00',
    })
    renderPage()

    const history = within(await screen.findByRole('region', { name: 'تاریخچه پرداخت' }))
    expect(await history.findByText('شارژ شهریور')).toBeInTheDocument()
    expect(history.getByText('پرداخت‌شده')).toBeInTheDocument()
    expect(history.getByText('مجموع پرداختی')).toBeInTheDocument()
    // Scoped to the rows: the total in the header shows the same figure.
    expect(within(history.getByRole('list')).getByText('500,000 تومان')).toBeInTheDocument()
  })

  it('refreshes the payment history after a successful payment', async () => {
    const user = userEvent.setup()
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    residentChargeApi.pending.mockResolvedValue({ charges: [septemberCharge] })
    residentChargeApi.history
      .mockResolvedValueOnce({ charges: [], total_paid: '0.00' })
      .mockResolvedValueOnce({
        charges: [{ ...septemberCharge, status: 'Paid', paid_at: '2026-08-09T10:00:00Z' }],
        total_paid: '500000.00',
      })
    residentChargeApi.pay.mockResolvedValue({ message: 'پرداخت با موفقیت انجام شد.' })
    renderPage()

    await screen.findByText(/هنوز پرداختی ثبت نشده است/)

    await user.click(screen.getByRole('checkbox', { name: 'انتخاب شارژ شهریور' }))
    await user.click(screen.getByRole('button', { name: /پرداخت انتخاب‌شده‌ها/ }))
    await user.click(await screen.findByRole('button', { name: /تأیید و پرداخت/ }))

    const history = within(screen.getByRole('region', { name: 'تاریخچه پرداخت' }))
    expect(await history.findByText('شارژ شهریور')).toBeInTheDocument()
    expect(history.getByText('مجموع پرداختی')).toBeInTheDocument()
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

  it('lists only the resident own bookings, split into the three categories', async () => {
    const user = userEvent.setup()
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    amenityApi.myReservations.mockResolvedValue({
      reservations: [upcomingReservation, pastReservation, canceledReservation],
    })
    renderPage()

    expect(await reservationsSection().findByText('باشگاه ورزشی')).toBeInTheDocument()
    expect(reservationsSection().queryByText('زمین تنیس')).not.toBeInTheDocument()

    await user.click(reservationsSection().getByRole('tab', { name: /گذشته/ }))
    expect(reservationsSection().getByText('زمین تنیس')).toBeInTheDocument()

    await user.click(reservationsSection().getByRole('tab', { name: /لغوشده/ }))
    expect(reservationsSection().getByText('سالن اجتماعات')).toBeInTheDocument()
  })

  it('moves a canceled booking to the canceled tab and frees its slot', async () => {
    const user = userEvent.setup()
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    // The booking grid needs an amenity selected before it reads any slots.
    amenityApi.list.mockResolvedValue({
      amenities: [{ id: 1, name: 'باشگاه ورزشی', operating_rules: '', is_active: true }],
    })
    amenityApi.myReservations.mockResolvedValue({ reservations: [upcomingReservation] })
    amenityApi.cancelReservation.mockResolvedValue({
      message: 'رزرو با موفقیت لغو شد.',
      reservation: { ...upcomingReservation, status: 'Canceled' },
    })
    renderPage()

    await reservationsSection().findByText('باشگاه ورزشی')
    const slotReadsBeforeCancel = amenityApi.getSlots.mock.calls.length

    await user.click(reservationsSection().getByRole('button', { name: 'لغو رزرو باشگاه ورزشی' }))
    await user.click(await screen.findByRole('button', { name: 'بله، رزرو لغو شود' }))

    expect(amenityApi.cancelReservation).toHaveBeenCalledWith(21)
    expect(await screen.findByText('رزرو با موفقیت لغو شد.')).toBeInTheDocument()

    // Gone from "upcoming", now filed under "canceled" without a refetch.
    await waitFor(() =>
      expect(reservationsSection().queryByText('باشگاه ورزشی')).not.toBeInTheDocument(),
    )
    expect(reservationsSection().getByRole('tab', { name: /پیش‌رو/ })).toHaveTextContent('0')

    await user.click(reservationsSection().getByRole('tab', { name: /لغوشده/ }))
    expect(reservationsSection().getByText('باشگاه ورزشی')).toBeInTheDocument()
    expect(reservationsSection().getByText('لغو شده')).toBeInTheDocument()
    expect(
      reservationsSection().queryByRole('button', { name: /لغو رزرو/ }),
    ).not.toBeInTheDocument()

    // The freed hour is re-read so it shows as bookable again.
    await waitFor(() =>
      expect(amenityApi.getSlots.mock.calls.length).toBeGreaterThan(slotReadsBeforeCancel),
    )
  })

  it('opens the account editor from the legacy dashboard and saves profile changes', async () => {
    const user = userEvent.setup()
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    authApi.updateProfile.mockResolvedValue({
      message: 'اطلاعات حساب با موفقیت ذخیره شد.',
      user: {
        id: 7,
        full_name: 'علی محمدزاده ویرایش شده',
        username: 'ali-edited',
        phone: '09120000000',
        national_id: '1234567891',
        role: 'resident',
      },
    })
    const setAuthState = vi.fn()
    render(
      <MemoryRouter>
        <ToastProvider>
          <ResidentDashboardPage authState={authState} setAuthState={setAuthState} />
        </ToastProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'ویرایش حساب' }))
    expect(await screen.findByRole('dialog', { name: 'ویرایش حساب کاربری' })).toBeInTheDocument()

    const nameInput = screen.getByLabelText('نام و نام خانوادگی')
    await user.clear(nameInput)
    await user.type(nameInput, 'علی محمدزاده ویرایش شده')
    await user.type(screen.getByLabelText('نام کاربری'), 'ali-edited')
    await user.type(screen.getByLabelText('کد ملی'), '1234567891')
    await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }))

    await waitFor(() => expect(authApi.updateProfile).toHaveBeenCalledTimes(1))
    expect(authApi.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'علی محمدزاده ویرایش شده',
        username: 'ali-edited',
        national_id: '1234567891',
      }),
    )
    expect(setAuthState).toHaveBeenCalledWith({
      loading: false,
      user: expect.objectContaining({ full_name: 'علی محمدزاده ویرایش شده' }),
    })
    expect(await screen.findByText('اطلاعات حساب با موفقیت ذخیره شد.')).toBeInTheDocument()
  })

  it('defaults to the legacy layout and can switch to the new dashboard', async () => {
    const user = userEvent.setup()
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    renderPage()

    expect(screen.getByRole('heading', { name: 'پنل ساکن' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ظاهر جدید' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ظاهر جدید' }))

    expect(screen.getByRole('heading', { name: 'نمای کلی' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ظاهر قدیمی' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'پنل ساکن' })).not.toBeInTheDocument()
    expect(await screen.findByText('خوش آمدید، علی محمدزاده')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'اطلاعیه‌های ساختمان' })).toBeInTheDocument()
  })

  it('keeps charges, reservations and services reachable from the new dashboard', async () => {
    const user = userEvent.setup()
    unitApi.myUnit.mockResolvedValue(sampleUnit)
    residentChargeApi.pending.mockResolvedValue({ charges: [septemberCharge] })
    amenityApi.myReservations.mockResolvedValue({ reservations: [upcomingReservation] })
    renderPage()

    await user.click(screen.getByRole('button', { name: 'ظاهر جدید' }))
    await user.click(screen.getAllByRole('button', { name: /شارژ/ })[0])

    expect(screen.getByRole('heading', { name: 'شارژ و پرداخت' })).toBeInTheDocument()
    expect(await screen.findByText('شارژ شهریور')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'تاریخچه پرداخت' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /رزرو/ })[0])
    expect(await screen.findByText('باشگاه ورزشی')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /خدمات/ })[0])
    expect(screen.getByRole('heading', { name: 'ثبت درخواست خدمات' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'پیگیری درخواست‌ها' })).toBeInTheDocument()
  })
})
