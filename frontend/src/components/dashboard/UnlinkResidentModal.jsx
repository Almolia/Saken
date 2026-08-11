import { LoaderCircle, UserMinus, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { managerApi } from '../../lib/api'

// Confirmation for detaching the resident from a unit. The unit itself, its
// debt and its occupancy status are left untouched — only the link is removed.
export function UnlinkResidentModal({ open, unit, onClose, onUpdated }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!unit?.owner) return null

  async function handleConfirm() {
    setLoading(true)
    setError('')

    try {
      const response = await managerApi.updateUnit(unit.id, { resident_id: null })
      onUpdated(response?.unit ?? { ...unit, owner: null })
      showToast(response?.message || 'ساکن واحد حذف شد.')
      onClose()
    } catch (unlinkError) {
      const message = unlinkError.message || 'حذف ساکن واحد ناموفق بود.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="حذف ساکن واحد"
      description={`آیا از حذف ساکن واحد ${unit.unit_number} اطمینان دارید؟`}
      onClose={loading ? () => {} : onClose}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">{unit.owner.full_name}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-400" dir="ltr">
              {unit.owner.phone}
            </p>
          </div>
        </div>

        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
          پس از حذف، این کاربر دیگر به اطلاعات واحد دسترسی نخواهد داشت و واحد بدون ساکن ثبت می‌شود. بدهی و وضعیت سکونت واحد بدون تغییر باقی می‌ماند.
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
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
            {loading ? 'در حال حذف...' : 'بله، ساکن حذف شود'}
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
