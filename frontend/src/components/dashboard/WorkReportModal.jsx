import { LoaderCircle, Send } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { staffServiceRequestApi } from '../../lib/serviceRequestApi'

// Mounted only while a task is selected, so the form starts clean every time
// rather than needing an effect to reset it.
export function WorkReportModal({ open, serviceRequest, onClose, onSubmitted }) {
  const { showToast } = useToast()
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!serviceRequest) return null

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedReport = report.trim()
    if (!trimmedReport) {
      // The backend only flips the status to Completed when a report is present.
      setError('برای تکمیل وظیفه، شرح کار انجام‌شده الزامی است.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const updatedRequest = await staffServiceRequestApi.submitWorkReport(
        serviceRequest.id,
        trimmedReport,
      )
      onSubmitted(updatedRequest)
      showToast('گزارش کار ثبت شد و وظیفه تکمیل شد.')
      onClose()
    } catch (submitError) {
      const message = submitError.message || 'ثبت گزارش کار ناموفق بود.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="ثبت گزارش کار"
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
          با ثبت گزارش، وضعیت این وظیفه به «تکمیل‌شده» تغییر می‌کند.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? 'در حال ثبت...' : 'ثبت و تکمیل وظیفه'}
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
