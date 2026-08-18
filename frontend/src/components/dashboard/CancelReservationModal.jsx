import { CalendarDays, Clock, LoaderCircle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { amenityApi } from '../../lib/amenityApi'
import { formatDate } from '../../utils/helpers'
import { formatTimeRange } from '../../utils/reservations'

// Mounted only while a booking is selected for cancellation, so the request
// state starts clean every time the resident opens it.
export function CancelReservationModal({ open, reservation, onClose, onCanceled }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!reservation) return null

  async function handleConfirm() {
    setLoading(true)
    setError('')

    try {
      const response = await amenityApi.cancelReservation(reservation.id)
      onCanceled(reservation.id, response?.reservation)
      showToast(response?.message || 'رزرو با موفقیت لغو شد.')
      onClose()
    } catch (cancelError) {
      // The booking may have started, or already been canceled in another tab.
      // Keeping the modal open puts the server's reason in front of the user.
      const message = cancelError.message || 'لغو رزرو ناموفق بود.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="لغو رزرو"
      description="آیا از لغو این رزرو اطمینان دارید؟"
      onClose={onClose}
      loading={loading}
      closeOnBackdrop={false}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-black text-slate-900">
            {reservation.amenity_name || `امکان #${reservation.amenity}`}
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-600">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            {formatDate(reservation.start_time)}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-600">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {formatTimeRange(reservation.start_time, reservation.end_time)}
          </p>
        </div>

        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
          با لغو رزرو، این بازه زمانی بلافاصله برای رزرو سایر ساکنان آزاد می‌شود و امکان بازگرداندن آن وجود ندارد.
        </p>

        {error ? (
          <p className="text-xs font-bold text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {loading ? 'در حال لغو...' : 'بله، رزرو لغو شود'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            انصراف
          </button>
        </div>
      </div>
    </Modal>
  )
}
