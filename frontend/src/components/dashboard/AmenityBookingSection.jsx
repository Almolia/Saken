import { Building, Check, Clock, RefreshCw, AlertCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../ToastProvider'
import { amenityApi } from '../../lib/amenityApi'
import { AmenityCalendar } from './AmenityCalendar'

function getTodayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function generateDefaultSlots(dateStr, unavailableList = []) {
  const slots = []
  for (let hour = 8; hour < 22; hour++) {
    const startStr = `${dateStr}T${String(hour).padStart(2, '0')}:00:00+03:30`
    const endStr = `${dateStr}T${String(hour + 1).padStart(2, '0')}:00:00+03:30`
    const label = `${String(hour).padStart(2, '0')}:00 تا ${String(hour + 1).padStart(2, '0')}:00`

    const isBooked = unavailableList.some((item) => {
      const itemStart = item.start_time || item.start
      const itemEnd = item.end_time || item.end
      if (!itemStart || !itemEnd) return false
      return new Date(itemStart) < new Date(endStr) && new Date(itemEnd) > new Date(startStr)
    })

    slots.push({
      start_time: startStr,
      end_time: endStr,
      start_time_formatted: `${String(hour).padStart(2, '0')}:00`,
      end_time_formatted: `${String(hour + 1).padStart(2, '0')}:00`,
      label,
      is_booked: isBooked,
      is_available: !isBooked,
    })
  }
  return slots
}

// The booking half of the amenities feature. What the resident has already
// booked lives in MyReservationsSection: onBookingCreated hands it the new
// booking, and bumping slotsRefreshToken re-reads the grid after a cancellation
// so the freed slot shows up as available again.
export function AmenityBookingSection({ onBookingCreated = () => {}, slotsRefreshToken = 0 }) {
  const { showToast } = useToast()

  const [amenities, setAmenities] = useState([])
  const [loadingAmenities, setLoadingAmenities] = useState(true)
  const [amenitiesError, setAmenitiesError] = useState('')

  const [selectedAmenity, setSelectedAmenity] = useState(null)
  const [selectedDate, setSelectedDate] = useState(getTodayISO())

  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [slotsError, setSlotsError] = useState('')

  const [selectedSlot, setSelectedSlot] = useState(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')

  const fetchAmenities = useCallback(() => {
    amenityApi
      .list()
      .then((data) => {
        const list = (data?.amenities || []).filter((a) => a.is_active !== false)
        setAmenities(list)
        if (list.length > 0) {
          setSelectedAmenity((prev) => prev || list[0])
        }
        setLoadingAmenities(false)
        setAmenitiesError('')
      })
      .catch((error) => {
        setLoadingAmenities(false)
        setAmenitiesError(error.message || 'خطا در بارگذاری امکانات')
      })
  }, [])

  const fetchSlots = useCallback((amenityId, dateStr) => {
    if (!amenityId || !dateStr) {
      return
    }
    amenityApi
      .getSlots(amenityId, dateStr)
      .then((data) => {
        let parsedSlots
        if (Array.isArray(data?.slots) && data.slots.length > 0) {
          parsedSlots = data.slots
        } else {
          const unavailable = data?.unavailable_slots || data?.booked_slots || data?.reservations || []
          parsedSlots = generateDefaultSlots(dateStr, unavailable)
        }
        setSlots(parsedSlots)
        setLoadingSlots(false)
        setSlotsError('')
      })
      .catch((error) => {
        setLoadingSlots(false)
        setSlotsError(error.message || 'خطا در دریافت بازه‌های زمانی')
      })
  }, [])

  useEffect(() => {
    fetchAmenities()
  }, [fetchAmenities])

  // slotsRefreshToken is in the dependency list on purpose: a cancellation
  // elsewhere on the dashboard frees a slot, and this re-reads the grid.
  useEffect(() => {
    if (selectedAmenity?.id && selectedDate) {
      fetchSlots(selectedAmenity.id, selectedDate)
    }
  }, [selectedAmenity, selectedDate, fetchSlots, slotsRefreshToken])

  async function handleConfirmBooking() {
    if (!selectedAmenity || !selectedSlot) return
    setBookingLoading(true)
    setBookingError('')

    try {
      const payload = {
        amenity: selectedAmenity.id,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
      }
      const response = await amenityApi.createReservation(payload)
      showToast(response?.message || 'رزرو با موفقیت انجام شد.')
      setSelectedSlot(null)
      fetchSlots(selectedAmenity.id, selectedDate)
      onBookingCreated(response?.reservation)
    } catch (error) {
      const msg = error.message || 'این بازه زمانی قبلاً رزرو شده است.'
      setBookingError(msg)
      showToast(msg, 'error')
      // Immediately refetch slots so someone else's booking appears visually booked
      fetchSlots(selectedAmenity.id, selectedDate)
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <section
      aria-label="امکانات و رزروها"
      className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-teal-600" />
            <h2 className="text-xl font-black text-slate-950">امکانات و رزروها</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            رزرو امکانات مشترک ساختمان (باشگاه، زمین ورزشی، سالن اجتماعات و...)
          </p>
        </div>
      </div>

      <div className="p-6">
        {loadingAmenities ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            در حال بارگذاری امکانات ساختمان...
          </div>
        ) : amenitiesError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-rose-600">{amenitiesError}</p>
            <button
              type="button"
              onClick={() => {
                setLoadingAmenities(true)
                fetchAmenities()
              }}
              className="mt-3 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              بارگذاری مجدد امکانات
            </button>
          </div>
        ) : amenities.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            در حال حاضر امکان فعالی برای رزرو در ساختمان وجود ندارد.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step 1: Select Amenity */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">
                ۱. انتخاب امکان:
              </label>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => {
                  const isSelected = selectedAmenity?.id === amenity.id
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => {
                        setSelectedAmenity(amenity)
                        setSelectedSlot(null)
                        setBookingError('')
                        setLoadingSlots(true)
                        setSlotsError('')
                      }}
                      className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-extrabold transition ${
                        isSelected
                          ? 'border-teal-600 bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30'
                          : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Building className="h-4 w-4" />
                      <span>{amenity.name}</span>
                    </button>
                  )
                })}
              </div>
              {selectedAmenity?.operating_rules && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>قوانین و ساعات کاری: {selectedAmenity.operating_rules}</span>
                </p>
              )}
            </div>

            {/* Step 2: Select Date Calendar */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">
                ۲. انتخاب تاریخ:
              </label>
              <AmenityCalendar
                selectedDate={selectedDate}
                onSelectDate={(dateStr) => {
                  setSelectedDate(dateStr)
                  setSelectedSlot(null)
                  setBookingError('')
                  setLoadingSlots(true)
                  setSlotsError('')
                }}
              />
            </div>

            {/* Step 3: Select Time Slot Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-600">
                  ۳. انتخاب ساعت (۸:۰۰ صبح تا ۲۲:۰۰ شب):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAmenity) {
                      setLoadingSlots(true)
                      fetchSlots(selectedAmenity.id, selectedDate)
                    }
                  }}
                  disabled={loadingSlots}
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingSlots ? 'animate-spin' : ''}`} />
                  بروزرسانی ساعت‌ها
                </button>
              </div>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-8 text-xs text-slate-500">
                  در حال دریافت بازه‌های زمانی...
                </div>
              ) : slotsError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-700">
                  {slotsError}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {slots.map((slot, i) => {
                    const isSelected = selectedSlot?.start_time === slot.start_time
                    const isBooked = slot.is_booked

                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isBooked || bookingLoading}
                        onClick={() => {
                          setSelectedSlot(slot)
                          setBookingError('')
                        }}
                        className={`relative flex flex-col items-center justify-center rounded-2xl border p-3 transition text-xs font-extrabold ${
                          isBooked
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'border-teal-600 bg-teal-600 text-white shadow-md ring-2 ring-teal-600/30'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-teal-400 hover:bg-teal-50/50'
                        }`}
                      >
                        <span>{slot.start_time_formatted || slot.label.split(' ')[0]}</span>
                        <span className="text-[10px] font-normal opacity-80">تا</span>
                        <span>{slot.end_time_formatted || slot.label.split(' ').slice(-1)[0]}</span>

                        <span
                          className={`mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isBooked
                              ? 'bg-slate-200 text-slate-600'
                              : isSelected
                                ? 'bg-teal-700 text-white'
                                : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isBooked ? 'رزرو شده' : 'قابل رزرو'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Step 4: Confirm Booking Action & Error Display */}
            {bookingError && (
              <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="text-xs text-slate-600">
                {selectedSlot ? (
                  <span>
                    بازه انتخابی: <strong className="text-slate-900">{selectedSlot.label}</strong> در تاریخ{' '}
                    <strong className="text-slate-900">{selectedDate}</strong>
                  </span>
                ) : (
                  <span>لطفاً یک بازه زمانی قابل رزرو را انتخاب کنید.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedSlot && (
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    انصراف
                  </button>
                )}
                <button
                  type="button"
                  disabled={!selectedSlot || bookingLoading}
                  onClick={handleConfirmBooking}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bookingLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>در حال ثبت...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>تأیید و ثبت رزرو</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
