import { LoaderCircle, Megaphone, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { managerApi } from '../../lib/api'

// Deleting is permanent — the backend removes the row rather than archiving it.
// Managers who only want to hide an announcement from residents should use the
// publish/archive toggle instead, which is what the note below points at.
export function DeleteAnnouncementModal({ open, announcement, onClose, onDeleted }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!announcement) return null

  async function handleConfirm() {
    setLoading(true)
    setError('')

    try {
      const response = await managerApi.deleteAnnouncement(announcement.id)
      onDeleted(announcement.id)
      showToast(response?.message || 'اطلاعیه با موفقیت حذف شد.')
      onClose()
    } catch (deleteError) {
      const message = deleteError.message || 'حذف اطلاعیه ناموفق بود.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="حذف اطلاعیه"
      description="این اطلاعیه برای همیشه حذف می‌شود و قابل بازیابی نیست."
      onClose={onClose}
      loading={loading}
      closeOnBackdrop={false}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">{announcement.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-500">
              {announcement.content}
            </p>
          </div>
        </div>

        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
          اگر فقط می‌خواهید این اطلاعیه از دید ساکنان پنهان شود، به جای حذف از گزینه «بایگانی» استفاده کنید.
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
            {loading ? 'در حال حذف...' : 'بله، اطلاعیه حذف شود'}
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
