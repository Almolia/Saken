import { LoaderCircle, Save } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { managerApi } from '../../lib/api'
import { occupancyStatusOptions } from '../../utils/units'

// Mounted only while a unit is selected, so the choice starts from that unit's
// current status every time instead of needing an effect to resync it.
export function UnitOccupancyModal({ open, unit, onClose, onUpdated }) {
  const { showToast } = useToast()
  const [status, setStatus] = useState(unit?.occupancy_status ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!unit) return null

  async function handleSubmit(event) {
    event.preventDefault()

    if (status === unit.occupancy_status) {
      onClose()
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await managerApi.updateUnit(unit.id, { occupancy_status: status })
      onUpdated(response?.unit ?? { ...unit, occupancy_status: status })
      showToast(response?.message || 'وضعیت سکونت واحد به‌روزرسانی شد.')
      onClose()
    } catch (updateError) {
      const message = updateError.message || 'به‌روزرسانی وضعیت واحد ناموفق بود.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`ویرایش واحد ${unit.unit_number}`}
      description="وضعیت سکونت این واحد را انتخاب کنید."
      onClose={onClose}
      loading={loading}
      closeOnBackdrop={false}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-bold text-slate-700">وضعیت سکونت</legend>
          {occupancyStatusOptions.map((option) => {
            const isSelected = status === option.value
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                  isSelected ? 'border-teal-500 bg-teal-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="occupancy_status"
                  value={option.value}
                  checked={isSelected}
                  onChange={(event) => {
                    setStatus(event.target.value)
                    if (error) setError('')
                  }}
                  disabled={loading}
                  className="mt-1 h-4 w-4 accent-teal-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-500">{option.description}</span>
                </span>
              </label>
            )
          })}
        </fieldset>

        <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
          وضعیت سکونت مستقل از ساکن ثبت‌شده است؛ تغییر آن ساکن واحد را حذف نمی‌کند.
        </p>

        {error ? (
          <p className="text-xs font-bold text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? 'در حال ذخیره...' : 'ذخیره وضعیت'}
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
      </form>
    </Modal>
  )
}
