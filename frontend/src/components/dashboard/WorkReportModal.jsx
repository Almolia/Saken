import { LoaderCircle, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { staffServiceRequestApi } from '../../lib/serviceRequestApi'
import { isCompleted as isRequestCompleted } from '../../utils/serviceRequests'

// Mounted only while a task is selected, so the form starts from the task's
// current report every time rather than needing an effect to resync it.
export function WorkReportModal({ open, serviceRequest, onClose, onSubmitted }) {
  const { showToast } = useToast()
  const isEditing = isRequestCompleted(serviceRequest)
  const [report, setReport] = useState(serviceRequest?.work_report || '')
  const [loading, setLoading] = useState(false)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const [error, setError] = useState('')

  if (!serviceRequest) return null

  async function runUpdate(action, successMessage) {
    setLoading(true)
    setError('')

    try {
      const updatedRequest = await action()
      onSubmitted(updatedRequest)
      showToast(successMessage)
      onClose()
    } catch (updateError) {
      const message = updateError.message || 'ثبت گزارش کار ناموفق بود.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()

    const trimmedReport = report.trim()
    if (!trimmedReport) {
      // An empty report would reopen the task, which is what the remove action
      // is for; make that an explicit choice rather than a silent side effect.
      setError('برای تکمیل وظیفه، شرح کار انجام‌شده الزامی است.')
      return
    }

    return runUpdate(
      () => staffServiceRequestApi.submitWorkReport(serviceRequest.id, trimmedReport),
      isEditing ? 'گزارش کار به‌روزرسانی شد.' : 'گزارش کار ثبت شد و وظیفه تکمیل شد.',
    )
  }

  function handleRemove() {
    return runUpdate(
      () => staffServiceRequestApi.clearWorkReport(serviceRequest.id),
      'گزارش کار حذف شد و وظیفه دوباره باز شد.',
    )
  }

  return (
    <Modal
      open={open}
      title={isEditing ? 'ویرایش گزارش کار' : 'ثبت گزارش کار'}
      description={serviceRequest.title}
      onClose={loading ? () => {} : onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="work-report" className="mb-2 block text-sm font-bold text-slate-700">
            شرح کار انجام‌شده
          </label>
          <textarea
            id="work-report"
            value={report}
            onChange={(event) => {
              setReport(event.target.value)
              if (error) setError('')
            }}
            disabled={loading}
            rows={5}
            placeholder="توضیح دهید چه اقدامی برای این درخواست انجام شد."
            className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          {error ? (
            <p className="mt-2 text-xs font-bold text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
          {isEditing
            ? 'متن جدید جایگزین گزارش قبلی می‌شود و وضعیت وظیفه «تکمیل‌شده» می‌ماند.'
            : 'با ثبت گزارش، وضعیت این وظیفه به «تکمیل‌شده» تغییر می‌کند.'}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? 'در حال ثبت...' : isEditing ? 'ذخیره تغییرات' : 'ثبت و تکمیل وظیفه'}
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

      {isEditing ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          {confirmingRemoval ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
              <p className="text-xs font-bold leading-6 text-rose-800">
                با حذف گزارش، وضعیت وظیفه به «ارجاع‌شده» برمی‌گردد و دوباره در فهرست کارهای باز شما قرار می‌گیرد.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={loading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  بله، حذف کن
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingRemoval(false)}
                  disabled={loading}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  بازگشت
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingRemoval(true)}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              حذف گزارش
            </button>
          )}
        </div>
      ) : null}
    </Modal>
  )
}
