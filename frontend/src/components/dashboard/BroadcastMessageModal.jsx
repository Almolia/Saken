import { Megaphone, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { InputField } from '../ui/InputField'
import { ServerError } from '../ui/ServerError'
import { managerApi } from '../../lib/api'
import { managerMessageApi } from '../../lib/messagingApi'
import { MESSAGE_BODY_MAX, MESSAGE_SUBJECT_MAX, validateMessage } from '../../lib/validators'

const EMPTY_UNITS = []

export function BroadcastMessageModal({ open, onClose, onSent, units: initialUnits = EMPTY_UNITS }) {
  if (!open) return null
  return <BroadcastMessageModalContent onClose={onClose} onSent={onSent} initialUnits={initialUnits} />
}

function BroadcastMessageModalContent({ onClose, onSent, initialUnits }) {
  const { showToast } = useToast()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [applyToAll, setApplyToAll] = useState(true)
  const [selectedUnitIds, setSelectedUnitIds] = useState([])
  const [units, setUnits] = useState(initialUnits)
  const [unitsLoading, setUnitsLoading] = useState(initialUnits.length === 0)
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialUnits.length > 0) return undefined

    let active = true
    managerApi
      .units()
      .then((response) => {
        if (!active) return
        setUnits(Array.isArray(response?.units) ? response.units : [])
      })
      .catch(() => {})
      .finally(() => {
        if (active) setUnitsLoading(false)
      })

    return () => {
      active = false
    }
  }, [initialUnits])

  function toggleUnit(unitId) {
    setSelectedUnitIds((current) => {
      const next = current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId]
      if (next.length > 0 && fieldErrors.unit_ids) {
        setFieldErrors((prev) => ({ ...prev, unit_ids: '' }))
      }
      return next
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const errors = validateMessage({ subject, body })
    if (!applyToAll && selectedUnitIds.length === 0) {
      errors.unit_ids = 'حداقل یک واحد باید انتخاب شود.'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setLoading(true)
    try {
      const payload = {
        subject: subject.trim(),
        body: body.trim(),
        unit_ids: applyToAll ? [] : selectedUnitIds,
      }
      const response = await managerMessageApi.broadcast(payload)
      onSent?.(response)
      showToast(response?.message || 'پیام همگانی با موفقیت ارسال شد.')
      onClose()
    } catch (error) {
      const message = error.message || 'ارسال پیام همگانی ناموفق بود.'
      setServerError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const ownedUnits = units.filter((unit) => unit.owner)
  const subjectLength = subject.trim().length
  const bodyLength = body.trim().length

  return (
    <Modal
      open
      title="ارسال پیام همگانی"
      description="موضوع و متن پیام را بنویسید. می‌توانید آن را برای همه ساکنان یا فقط واحدهای انتخابی بفرستید."
      onClose={onClose}
      loading={loading}
      closeOnBackdrop={false}
      size="lg"
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <InputField
          label="موضوع پیام"
          name="subject"
          type="text"
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value)
            if (fieldErrors.subject) setFieldErrors((current) => ({ ...current, subject: '' }))
          }}
          error={fieldErrors.subject}
          placeholder="مثلاً: قطع آب ساختمان در روز پنج‌شنبه"
          helper={`${subjectLength} از ${MESSAGE_SUBJECT_MAX} کاراکتر`}
        />

        <label className="block" htmlFor="broadcast-message-body">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">متن پیام</span>
          <textarea
            id="broadcast-message-body"
            name="body"
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              if (fieldErrors.body) setFieldErrors((current) => ({ ...current, body: '' }))
            }}
            placeholder="متن پیام همگانی را بنویسید..."
            rows={6}
            className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${
              fieldErrors.body ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
            }`}
          />
          <div className="mt-2 flex items-start justify-between gap-3">
            {fieldErrors.body ? (
              <small className="text-xs font-medium text-rose-600">{fieldErrors.body}</small>
            ) : (
              <small className="text-xs font-medium leading-6 text-slate-500">
                هر ساکن این پیام را در صندوق شخصی خودش می‌بیند و می‌تواند خصوصی پاسخ دهد.
              </small>
            )}
            <small
              className={`shrink-0 text-xs font-bold tabular-nums ${
                bodyLength > MESSAGE_BODY_MAX ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              {bodyLength} از {MESSAGE_BODY_MAX}
            </small>
          </div>
        </label>

        <fieldset disabled={loading} className="space-y-2">
          <legend className="mb-2 block text-sm font-bold text-slate-700">مخاطبان پیام</legend>
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
                name="broadcast_scope"
                checked={applyToAll}
                onChange={() => {
                  setApplyToAll(true)
                  if (fieldErrors.unit_ids) setFieldErrors((current) => ({ ...current, unit_ids: '' }))
                }}
                className="mt-1 h-4 w-4 accent-teal-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">همه ساکنان</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  ارسال برای تمام واحدهایی که ساکن دارند
                </span>
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
                name="broadcast_scope"
                checked={!applyToAll}
                onChange={() => setApplyToAll(false)}
                className="mt-1 h-4 w-4 accent-teal-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">واحدهای انتخابی</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  فقط ساکنان واحدهای مشخص‌شده
                </span>
              </span>
            </label>
          </div>

          {!applyToAll ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-slate-700">
                  انتخاب واحدها ({selectedUnitIds.length} از {ownedUnits.length} دارای ساکن)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUnitIds(ownedUnits.map((unit) => unit.id))}
                    className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-teal-700 shadow-sm ring-1 ring-slate-200 hover:bg-teal-50"
                  >
                    انتخاب همه
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUnitIds([])}
                    className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    لغو همه
                  </button>
                </div>
              </div>

              {unitsLoading ? (
                <div className="py-4 text-center text-xs text-slate-500">در حال دریافت فهرست واحدها...</div>
              ) : units.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">هیچ واحدی در ساختمان ثبت نشده است.</div>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto pe-1">
                  {units.map((unit) => {
                    const isSelected = selectedUnitIds.includes(unit.id)
                    const hasOwner = Boolean(unit.owner)
                    return (
                      <label
                        key={unit.id}
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                          !hasOwner
                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                            : isSelected
                              ? 'cursor-pointer border-teal-400 bg-teal-50/80 font-bold text-teal-950'
                              : 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!hasOwner}
                            onChange={() => toggleUnit(unit.id)}
                            className="h-4 w-4 rounded accent-teal-600"
                          />
                          <span>
                            واحد {unit.unit_number} (طبقه {unit.floor})
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          {unit.owner?.full_name || 'بدون ساکن'}
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

        <ServerError error={serverError} />

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            {loading ? 'در حال ارسال...' : 'ارسال پیام همگانی'}
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
