import { CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { sumChargeAmounts } from '../../hooks/useChargeSelection'
import { residentChargeApi } from '../../lib/billingApi'
import { formatCurrency } from '../../utils/helpers'

/**
 * Simulated payment gateway for the resident's selected charges.
 *
 * `charges` is the snapshot taken when "Pay Selected" was clicked, so a
 * background refresh of the dashboard cannot change what is being confirmed
 * halfway through. The gateway is mocked: confirming posts the charge ids
 * straight to the backend, which flips them to Paid, lowers the unit debt and
 * credits the building wallet in one transaction.
 */
export function PaymentModal({ open, charges, unitDebt, onClose, onPaid, onFailed }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open || charges.length === 0) return null

  const totalAmount = sumChargeAmounts(charges)
  const debt = Number.parseFloat(unitDebt)
  const remainingDebt = Number.isFinite(debt) ? Math.max(debt - totalAmount, 0) : null

  async function handleConfirm() {
    setLoading(true)
    setError('')

    const chargeIds = charges.map((charge) => charge.id)

    try {
      const response = await residentChargeApi.pay(chargeIds)
      onPaid(chargeIds)
      showToast(response?.message || 'پرداخت با موفقیت انجام شد.')
      onClose()
    } catch (submitError) {
      // Most rejections mean the selection went stale (a bill was already paid
      // or removed), so the caller resyncs the list behind the error message.
      const message = submitError.message || 'پرداخت ناموفق بود.'
      setError(message)
      showToast(message, 'error')
      onFailed?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="پرداخت شارژ"
      description={`${charges.length} صورت‌حساب برای پرداخت انتخاب شده است`}
      onClose={onClose}
      loading={loading}
      closeOnBackdrop={false}
    >
      <div className="space-y-5">
        <ul aria-label="صورت‌حساب‌های انتخاب‌شده" className="max-h-52 space-y-2 overflow-y-auto pl-1">
          {charges.map((charge) => (
            <li
              key={charge.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <span className="min-w-0 truncate text-sm font-bold text-slate-800">{charge.title}</span>
              <span className="shrink-0 text-sm font-black text-slate-900">
                {formatCurrency(charge.amount)}
              </span>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-700">مبلغ قابل پرداخت</span>
            <span className="text-xl font-black text-teal-700">{formatCurrency(totalAmount)}</span>
          </div>
          {remainingDebt !== null ? (
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-teal-200 pt-2">
              <span className="text-xs font-bold text-slate-500">بدهی باقی‌مانده پس از پرداخت</span>
              <span className="text-xs font-black text-slate-700">{formatCurrency(remainingDebt)}</span>
            </div>
          ) : null}
        </div>

        <p className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium leading-6 text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          این درگاه پرداخت شبیه‌سازی‌شده است. با تأیید، صورت‌حساب‌های بالا پرداخت‌شده ثبت می‌شوند و از
          بدهی واحد شما کسر می‌گردد.
        </p>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold leading-6 text-rose-700"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {loading ? 'در حال پرداخت...' : 'تأیید و پرداخت'}
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
