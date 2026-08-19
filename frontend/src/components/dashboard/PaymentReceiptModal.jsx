import { BadgeCheck, Printer } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers'

function ReceiptRow({ label, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-200 py-2.5 last:border-0">
      <span className="shrink-0 text-xs font-bold text-slate-500">{label}</span>
      <span
        className={`min-w-0 break-words text-left ${
          strong ? 'text-base font-black text-slate-950' : 'text-sm font-bold text-slate-800'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * The resident's own copy of a single settled charge.
 *
 * A row in the history proves a payment happened; a receipt is what gets kept
 * or handed to someone else, so it carries the reference number, the exact
 * settlement time and the bill it closed, and can be printed or saved as PDF
 * through the browser's own print dialog.
 */
export function PaymentReceiptModal({ open, charge, onClose }) {
  if (!charge) return null

  const description = charge.description?.trim()

  return (
    <Modal
      open={open}
      title="رسید پرداخت"
      description={`شماره رسید ${charge.id}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div
          data-print-area
          className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
        >
          <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-950">پرداخت با موفقیت انجام شده است</div>
              <div className="text-xs font-bold text-slate-500">سامانه مدیریت ساختمان ساکن</div>
            </div>
          </div>

          <ReceiptRow label="شماره رسید" value={`#${charge.id}`} />
          <ReceiptRow label="عنوان صورت‌حساب" value={charge.title} />
          {description ? <ReceiptRow label="توضیحات" value={description} /> : null}
          <ReceiptRow label="مبلغ پرداخت‌شده" value={formatCurrency(charge.amount)} strong />
          <ReceiptRow
            label="تاریخ و ساعت پرداخت"
            // Charges settled before the backend recorded payment times carry
            // no timestamp; the receipt says so rather than inventing one.
            value={charge.paid_at ? formatDateTime(charge.paid_at) : 'ثبت نشده است'}
          />
          {charge.due_date ? (
            <ReceiptRow label="مهلت پرداخت صورت‌حساب" value={formatDate(charge.due_date)} />
          ) : null}
          <ReceiptRow label="وضعیت" value="پرداخت‌شده" />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            چاپ یا ذخیره رسید
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {/* Distinct from the shared modal's "بستن" close icon so the two
                controls do not collide under the same accessible name. */}
            بستن رسید
          </button>
        </div>
      </div>
    </Modal>
  )
}
