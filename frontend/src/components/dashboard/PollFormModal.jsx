import { CalendarClock, Rocket, Save } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { InputField } from '../ui/InputField'
import { JalaliDateInput } from '../ui/JalaliDateInput'
import { PrimaryButton } from '../ui/PrimaryButton'
import { ServerError } from '../ui/ServerError'
import { Toggle } from '../ui/Toggle'
import { PollOptionsField } from './PollOptionsField'
import { PollTargetField } from './PollTargetField'
import { useForm } from '../../hooks/useForm'
import { POLL_DESCRIPTION_MAX, POLL_TITLE_MAX, validatePoll } from '../../lib/validators'
import {
  PollApiStatus,
  combineLocalDateTime,
  optionTexts,
  splitLocalDateTime,
  targetUnitIds,
  targetsAllUnits,
} from '../../utils/polls'

function initialValues(poll) {
  const deadline = splitLocalDateTime(poll?.ends_at)
  const options = optionTexts(poll)

  return {
    title: poll?.title ?? '',
    description: poll?.description ?? '',
    // Two empty rows are the smallest usable question, and the smallest one the
    // server accepts.
    options: options.length >= 2 ? options : ['', ''],
    endDate: deadline.date,
    // A deadline typed without a time means "any time that day", so the end of
    // the day is the reading that does not cut a resident's last hours short.
    endTime: deadline.time || '23:59',
    targetAll: targetsAllUnits(poll),
    targetUnitIds: targetUnitIds(poll),
    // Only offered while creating: an existing draft is published from the
    // master list, where the confirmation spells out what publishing means.
    publishNow: false,
  }
}

export function PollFormModal({ open, ...props }) {
  // Mounting fresh on each open is what resets the form. The alternative —
  // mirroring `open` into a dozen state values inside an effect — is the bug
  // this avoids: a half-typed poll reappearing the next time the modal opens.
  if (!open) return null
  return <PollFormModalContent {...props} />
}

function PollFormModalContent({ poll, units = [], unitsError = '', onClose, onSubmit }) {
  const isEdit = Boolean(poll?.id)
  // The Jalali input reports an unparsable date itself; the form's own rules
  // only ever see a valid ISO day or an empty one.
  const [dateError, setDateError] = useState('')

  const form = useForm({
    initialValues: initialValues(poll),
    validate: validatePoll,
    onSubmit: async (values) => {
      const options = values.options
        .map((option) => option.trim())
        .filter(Boolean)
        .map((text, position) => ({ text, position }))

      const payload = {
        title: values.title.trim(),
        description: values.description.trim(),
        ends_at: combineLocalDateTime(values.endDate, values.endTime),
        target_units: values.targetAll ? [] : values.targetUnitIds,
        options,
      }

      if (!isEdit) {
        payload.status = values.publishNow ? PollApiStatus.ACTIVE : PollApiStatus.DRAFT
        // The server refuses to publish without a start, and a poll published
        // from this form starts the moment it is created.
        if (values.publishNow) payload.starts_at = new Date().toISOString()
      }

      // Letting the error escape is deliberate: useForm catches it, shows it
      // inline and leaves the modal open with every answer still typed in.
      await onSubmit(payload)
      onClose()
    },
  })

  const titleLength = form.values.title.trim().length
  const descriptionLength = form.values.description.trim().length
  const publishing = !isEdit && form.values.publishNow

  return (
    <Modal
      open
      size="lg"
      title={isEdit ? 'ویرایش نظرسنجی' : 'ایجاد نظرسنجی جدید'}
      description={
        isEdit
          ? 'تا وقتی نظرسنجی پیش‌نویس است می‌توانید پرسش، گزینه‌ها، مهلت و واحدهای هدف را تغییر دهید.'
          : 'پرسش، گزینه‌های پاسخ و مهلت رأی‌گیری را مشخص کنید. می‌توانید آن را پیش‌نویس نگه دارید و بعداً منتشر کنید.'
      }
      onClose={onClose}
      loading={form.loading}
      closeOnBackdrop={false}
    >
      <form className="space-y-5" onSubmit={form.handleSubmit} noValidate>
        <InputField
          label="پرسش نظرسنجی"
          name="title"
          type="text"
          value={form.values.title}
          onChange={form.handleChange}
          error={form.errors.title}
          placeholder="مثلاً: رنگ نمای جدید ساختمان کدام باشد؟"
          helper={`${titleLength} از ${POLL_TITLE_MAX} کاراکتر`}
        />

        <div>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              توضیحات
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500">
                اختیاری
              </span>
            </span>
            <textarea
              name="description"
              value={form.values.description}
              onChange={form.handleChange}
              rows={3}
              placeholder="زمینه تصمیم را برای ساکنان توضیح دهید..."
              className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${
                form.errors.description ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
              }`}
            />
          </label>
          <div className="mt-2 flex items-start justify-between gap-3">
            {form.errors.description ? (
              <small className="text-xs font-medium text-rose-600">{form.errors.description}</small>
            ) : (
              <small className="text-xs font-medium leading-6 text-slate-500">
                این متن زیر پرسش، در داشبورد ساکنان نمایش داده می‌شود.
              </small>
            )}
            <small
              className={`shrink-0 text-xs font-bold tabular-nums ${
                descriptionLength > POLL_DESCRIPTION_MAX ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              {descriptionLength} از {POLL_DESCRIPTION_MAX}
            </small>
          </div>
        </div>

        <PollOptionsField
          options={form.values.options}
          onChange={(next) => form.setFieldValue('options', next)}
          error={form.errors.options}
          disabled={form.loading}
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <span className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <CalendarClock className="h-4 w-4 text-teal-600" aria-hidden="true" />
            مهلت رأی‌گیری
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="poll-end-date" className="mb-2 block text-xs font-bold text-slate-600">
                تاریخ پایان
              </label>
              <JalaliDateInput
                id="poll-end-date"
                name="ends_at_date"
                value={form.values.endDate}
                onChange={(value) => {
                  setDateError('')
                  form.setFieldValue('endDate', value)
                }}
                onInvalid={setDateError}
                disabled={form.loading}
                className={
                  form.errors.endDate || dateError ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                }
              />
            </div>
            <div>
              <label htmlFor="poll-end-time" className="mb-2 block text-xs font-bold text-slate-600">
                ساعت پایان
              </label>
              <input
                id="poll-end-time"
                name="ends_at_time"
                type="time"
                dir="ltr"
                value={form.values.endTime}
                onChange={(event) => form.setFieldValue('endTime', event.target.value)}
                disabled={form.loading}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
          </div>
          {dateError || form.errors.endDate ? (
            <small className="mt-2 block text-xs font-medium text-rose-600" role="alert">
              {dateError || form.errors.endDate}
            </small>
          ) : (
            <small className="mt-2 block text-xs font-medium leading-6 text-slate-500">
              پس از این لحظه هیچ رأی تازه‌ای پذیرفته نمی‌شود.
            </small>
          )}
        </div>

        <PollTargetField
          targetAll={form.values.targetAll}
          onTargetAllChange={(value) => form.setFieldValue('targetAll', value)}
          selectedIds={form.values.targetUnitIds}
          onSelectedIdsChange={(next) => form.setFieldValue('targetUnitIds', next)}
          units={units}
          unitsError={unitsError}
          error={form.errors.targetUnitIds}
          disabled={form.loading}
        />

        {isEdit ? null : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <Toggle
              checked={form.values.publishNow}
              onChange={(value) => form.setFieldValue('publishNow', value)}
              disabled={form.loading}
              label="انتشار فوری برای ساکنان"
            />
            <p className="mt-2 text-xs leading-6 text-slate-500">
              {form.values.publishNow
                ? 'نظرسنجی بلافاصله فعال می‌شود و ساکنان هدف می‌توانند رأی بدهند. پس از انتشار دیگر قابل ویرایش نیست.'
                : 'نظرسنجی به صورت پیش‌نویس ذخیره می‌شود؛ هیچ ساکنی آن را نمی‌بیند و هر زمان خواستید می‌توانید منتشرش کنید.'}
            </p>
          </div>
        )}

        <ServerError error={form.serverError} />

        <PrimaryButton loading={form.loading}>
          {isEdit ? (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              ذخیره تغییرات
            </>
          ) : publishing ? (
            <>
              <Rocket className="h-4 w-4" aria-hidden="true" />
              ایجاد و انتشار نظرسنجی
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              ذخیره پیش‌نویس
            </>
          )}
        </PrimaryButton>
      </form>
    </Modal>
  )
}
