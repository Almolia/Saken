import { CreditCard, LoaderCircle } from 'lucide-react'
import { formatCurrency } from '../../utils/helpers'

/**
 * Sticky summary of the current selection, pinned to the bottom of the charges
 * section. Always rendered while the resident has pending charges so the
 * "Pay Selected" button is visible (but disabled) before anything is ticked.
 */
export function ChargeSelectionBar({ selectedCount, totalAmount, unitDebt, onPay, paying = false }) {
  const hasSelection = selectedCount > 0

  const debt = Number.parseFloat(unitDebt)
  // Only shown when we actually know the balance, and never below zero: the
  // dashboard should not imply the building owes the resident money.
  const remainingDebt = Number.isFinite(debt) ? Math.max(debt - totalAmount, 0) : null

  return (
    <div className="sticky bottom-4 z-20 mt-6">
      <div
        aria-label="خلاصه شارژهای انتخاب‌شده"
        className={`flex flex-col gap-4 rounded-[1.5rem] border p-5 shadow-xl backdrop-blur transition sm:flex-row sm:items-center sm:justify-between ${
          hasSelection
            ? 'border-teal-200 bg-teal-50/95 shadow-teal-200/60'
            : 'border-slate-200 bg-white/95 shadow-slate-200/70'
        }`}
      >
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-500">
            {hasSelection
              ? `${selectedCount} صورت‌حساب انتخاب شده است`
              : 'برای پرداخت، صورت‌حساب‌های خود را انتخاب کنید'}
          </div>
          <div
            className={`mt-1 text-2xl font-black tracking-tight ${
              hasSelection ? 'text-teal-700' : 'text-slate-400'
            }`}
          >
            {formatCurrency(totalAmount)}
          </div>
          {hasSelection && remainingDebt !== null ? (
            <div className="mt-1 text-xs font-bold text-slate-500">
              بدهی باقی‌مانده پس از پرداخت: {formatCurrency(remainingDebt)}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onPay}
          disabled={!hasSelection || paying}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          {paying ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          پرداخت انتخاب‌شده‌ها
        </button>
      </div>
    </div>
  )
}
