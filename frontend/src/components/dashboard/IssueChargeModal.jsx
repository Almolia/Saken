import { Check, CheckSquare, Coins, LoaderCircle, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { ServerError } from '../ui/ServerError'
import { managerChargeApi } from '../../lib/billingApi'
import { managerApi } from '../../lib/api'
import { validateCharge } from '../../lib/validators'

export function IssueChargeModal({
  open,
  onClose,
  onChargeIssued,
  units: initialUnits = [],
}) {
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [applyToAll, setApplyToAll] = useState(true)
  const [selectedUnitIds, setSelectedUnitIds] = useState([])
  const [units, setUnits] = useState(initialUnits)
  const [unitsLoading, setUnitsLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')

  // Fetch or sync units when opening the modal
  useEffect(() => {
    if (!open) return

    setFieldErrors({})
    setServerError('')
    setTitle('')
    setDescription('')
    setAmount('')
    setDueDate('')
    setApplyToAll(true)
    setSelectedUnitIds([])

    if (initialUnits && initialUnits.length > 0) {
      setUnits(initialUnits)
    } else {
      setUnitsLoading(true)
      let active = true
      managerApi
        .units()
        .then((res) => {
          if (!active) return
          const fetched = Array.isArray(res?.units) ? res.units : []
          setUnits(fetched)
        })
        .catch(() => {
          // Fallback gracefully
        })
        .finally(() => {
          if (active) setUnitsLoading(false)
        })
      return () => {
        active = false
      }
    }
  }, [open, initialUnits])

  if (!open) return null

  function toggleUnit(unitId) {
    setSelectedUnitIds((current) => {
      const exists = current.includes(unitId)
      const next = exists ? current.filter((id) => id !== unitId) : [...current, unitId]
      if (next.length > 0 && fieldErrors.unit_ids) {
        setFieldErrors((prev) => ({ ...prev, unit_ids: '' }))
      }
      return next
    })
  }

  function handleSelectAllUnits() {
    setSelectedUnitIds(units.map((u) => u.id))
    if (fieldErrors.unit_ids) {
      setFieldErrors((prev) => ({ ...prev, unit_ids: '' }))
    }
  }

  function handleDeselectAllUnits() {
    setSelectedUnitIds([])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const values = {
      title,
      description,
      amount,
      due_date: dueDate,
      apply_to_all: applyToAll,
      unit_ids: selectedUnitIds,
    }

    const errors = validateCharge(values)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setLoading(true)

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        amount: Number(amount).toFixed(2),
        due_date: dueDate,
        apply_to_all: applyToAll,
        ...(applyToAll ? {} : { unit_ids: selectedUnitIds }),
      }

      const response = await managerChargeApi.create(payload)
      const newCharge = response.charge || response

      if (onChargeIssued) {
        onChargeIssued(newCharge)
      }

      const successMessage = response.message || 'شارژ جدید با موفقیت صادر شد.'
      showToast(successMessage)
      onClose()
    } catch (err) {
      const message = err.message || 'خطایی در صدور شارژ رخ داد.'
      setServerError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="صدور شارژ جدید"
      description="مشخصات شارژ دوره‌ای را وارد کرده و واحدهای مشمول را مشخص کنید."
      onClose={loading ? () => {} : onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {/* Title */}
        <div>
          <label htmlFor="charge-title" className="mb-2 block text-sm font-bold text-slate-700">
            عنوان شارژ
          </label>
          <input
            id="charge-title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }))
            }}
            disabled={loading}
            placeholder="مثلاً شارژ ماهیانه شهریور ۱۴۰۵"
            className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${
              fieldErrors.title ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
            }`}
          />
          {fieldErrors.title ? (
            <small className="mt-1.5 block text-xs font-medium text-rose-600">{fieldErrors.title}</small>
          ) : null}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="charge-description" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            توضیحات شارژ
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500">اختیاری</span>
          </label>
          <textarea
            id="charge-description"
            name="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            placeholder="توضیحات تکمیلی در مورد هزینه‌ها و نحوه محاسبه..."
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        {/* Amount & Due Date */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Amount per unit */}
          <div>
            <label htmlFor="charge-amount" className="mb-2 block text-sm font-bold text-slate-700">
              مبلغ هر واحد (تومان)
            </label>
            <input
              id="charge-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: '' }))
              }}
              disabled={loading}
              placeholder="مثلاً 500000"
              dir="ltr"
              className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                fieldErrors.amount ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
              }`}
            />
            {fieldErrors.amount ? (
              <small className="mt-1.5 block text-xs font-medium text-rose-600">{fieldErrors.amount}</small>
            ) : null}
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="charge-due-date" className="mb-2 block text-sm font-bold text-slate-700">
              مهلت پرداخت
            </label>
            <input
              id="charge-due-date"
              name="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value)
                if (fieldErrors.due_date) setFieldErrors((prev) => ({ ...prev, due_date: '' }))
              }}
              disabled={loading}
              className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                fieldErrors.due_date ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
              }`}
            />
            {fieldErrors.due_date ? (
              <small className="mt-1.5 block text-xs font-medium text-rose-600">{fieldErrors.due_date}</small>
            ) : null}
          </div>
        </div>

        {/* Selection Mechanism: Apply to All Units vs Select Specific Units */}
        <fieldset disabled={loading} className="space-y-2">
          <legend className="mb-2 block text-sm font-bold text-slate-700">واحدهای مشمول شارژ</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                applyToAll
                  ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-100'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="apply_scope"
                checked={applyToAll}
                onChange={() => {
                  setApplyToAll(true)
                  if (fieldErrors.unit_ids) setFieldErrors((prev) => ({ ...prev, unit_ids: '' }))
                }}
                className="mt-1 h-4 w-4 accent-teal-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">تمام واحدها</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">اعمال برای کلیه واحدهای ساختمان</span>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                !applyToAll
                  ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-100'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="apply_scope"
                checked={!applyToAll}
                onChange={() => setApplyToAll(false)}
                className="mt-1 h-4 w-4 accent-teal-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">واحدهای انتخابی</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">انتخاب واحدهای مشخص ساختمان</span>
              </span>
            </label>
          </div>

          {/* Specific Units Selection List */}
          {!applyToAll ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-slate-700">
                  انتخاب واحدها ({selectedUnitIds.length} از {units.length} انتخاب شده)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllUnits}
                    className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-teal-700 shadow-sm ring-1 ring-slate-200 hover:bg-teal-50"
                  >
                    انتخاب همه
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllUnits}
                    className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    لغو همه
                  </button>
                </div>
              </div>

              {unitsLoading ? (
                <div className="py-4 text-center text-xs text-slate-500">در حال دریافت لیست واحدها...</div>
              ) : units.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">هیچ واحدی در ساختمان ثبت نشده است.</div>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto pe-1">
                  {units.map((unit) => {
                    const isSelected = selectedUnitIds.includes(unit.id)
                    return (
                      <label
                        key={unit.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                          isSelected
                            ? 'border-teal-400 bg-teal-50/80 font-bold text-teal-950'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUnit(unit.id)}
                            className="h-4 w-4 rounded accent-teal-600"
                          />
                          <span>
                            واحد {unit.unit_number} (طبقه {unit.floor})
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          {unit.owner?.full_name ? unit.owner.full_name : 'بدون ساکن'}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}

              {fieldErrors.unit_ids ? (
                <small className="mt-2 block text-xs font-medium text-rose-600">{fieldErrors.unit_ids}</small>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        {serverError ? <ServerError error={serverError} /> : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            {loading ? 'در حال صدور شارژ...' : 'صدور شارژ'}
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
