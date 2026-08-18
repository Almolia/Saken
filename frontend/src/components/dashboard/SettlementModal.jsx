import { LoaderCircle, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { managerServiceRequestApi } from '../../lib/serviceRequestApi'
import { PaymentMethod, paymentMethodOptions } from '../../utils/serviceRequests'

function validateCost(rawCost) {
  const trimmed = String(rawCost).trim()
  if (!trimmed) return 'مبلغ هزینه الزامی است.'

  const value = Number(trimmed)
  if (Number.isNaN(value)) return 'مبلغ هزینه باید یک عدد باشد.'
  if (value <= 0) return 'مبلغ هزینه باید بزرگ‌تر از صفر باشد.'

  return ''
}

// Mounted only while a request is selected, so the form starts clean each time.
export function SettlementModal({ open, serviceRequest, onClose, onSettled }) {
  const { showToast } = useToast()
  const [cost, setCost] = useState('')
  const [method, setMethod] = useState(PaymentMethod.EQUAL_SPLIT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!serviceRequest) return null

  async function handleSubmit(event) {
    event.preventDefault()

    const costError = validateCost(cost)
    if (costError) {
      setError(costError)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await managerServiceRequestApi.settleRequest(serviceRequest.id, {
        cost: Number(cost).toFixed(2),
        payment_method: method,
      })
      onSettled(response.request)
      showToast(response.message || 'تسویه هزینه با موفقیت انجام شد.')
      onClose()
    } catch (submitError) {
      // Covers the backend rejections the user can act on, most importantly an
      // insufficient building wallet balance.
      const message = submitError.message || 'تسویه هزینه ناموفق بود.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="تسویه هزینه"
      description={serviceRequest.title}
      onClose={onClose}
      loading={loading}
      closeOnBackdrop={false}
    >
      {/* noValidate so the Persian messages below are what the user sees,
          rather than the browser's native constraint bubbles. */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="settlement-cost" className="mb-2 block text-sm font-bold text-slate-700">
            مبلغ کل هزینه (تومان)
          </label>
          <input
            id="settlement-cost"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={cost}
            onChange={(event) => {
              setCost(event.target.value)
              if (error) setError('')
            }}
            disabled={loading}
            placeholder="برای مثال 250000"
            dir="ltr"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <fieldset disabled={loading} className="min-w-0">
          <legend className="mb-2 block text-sm font-bold text-slate-700">روش پرداخت</legend>
          <div className="space-y-2">
            {paymentMethodOptions.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                  method === option.value
                    ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={option.value}
                  checked={method === option.value}
                  onChange={() => {
                    setMethod(option.value)
                    if (error) setError('')
                  }}
                  className="mt-1 h-4 w-4 accent-teal-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-500">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold leading-6 text-rose-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            {loading ? 'در حال تسویه...' : 'ثبت تسویه'}
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
