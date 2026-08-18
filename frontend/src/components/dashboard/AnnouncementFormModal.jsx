import { useEffect, useRef } from 'react'
import { Modal } from '../ui/Modal'
import { InputField } from '../ui/InputField'
import { PrimaryButton } from '../ui/PrimaryButton'
import { ServerError } from '../ui/ServerError'
import { Toggle } from '../ui/Toggle'
import { useForm } from '../../hooks/useForm'
import {
  ANNOUNCEMENT_CONTENT_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  validateAnnouncement,
} from '../../lib/validators'

export function AnnouncementFormModal({ open, announcement, onClose, onSubmit }) {
  const isEdit = Boolean(announcement?.id)

  const form = useForm({
    initialValues: {
      title: announcement?.title ?? '',
      content: announcement?.content ?? '',
      is_active: announcement?.is_active ?? true,
    },
    validate: validateAnnouncement,
    onSubmit: async (values) => {
      await onSubmit({
        title: values.title.trim(),
        content: values.content.trim(),
        is_active: values.is_active,
      })
      onClose()
    },
  })

  const previousTargetRef = useRef(null)
  const setValues = form.setValues

  // Do not rely on the parent remounting this component. A new identity is
  // synchronized, while a same-record parent render preserves in-progress text.
  useEffect(() => {
    if (!open) {
      previousTargetRef.current = null
      return
    }

    const targetId = announcement?.id ?? 'new'
    if (previousTargetRef.current === targetId) return

    previousTargetRef.current = targetId
    setValues({
      title: announcement?.title ?? '',
      content: announcement?.content ?? '',
      is_active: announcement?.is_active ?? true,
    })
  }, [announcement, open, setValues])

  const titleLength = form.values.title.trim().length
  const contentLength = form.values.content.trim().length

  return (
    <Modal
      open={open}
      title={isEdit ? 'ویرایش اطلاعیه' : 'انتشار اطلاعیه جدید'}
      description={
        isEdit
          ? 'متن اطلاعیه را ویرایش کنید. تغییرات بلافاصله برای ساکنان قابل مشاهده است.'
          : 'عنوان و متن اطلاعیه را وارد کنید تا برای همه ساکنان منتشر شود.'
      }
      onClose={onClose}
      loading={form.loading}
      closeOnBackdrop={false}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit} noValidate>
        <InputField
          label="عنوان اطلاعیه"
          name="title"
          type="text"
          value={form.values.title}
          onChange={form.handleChange}
          error={form.errors.title}
          placeholder="مثلاً: قطع آب ساختمان در روز پنج‌شنبه"
          helper={`${titleLength} از ${ANNOUNCEMENT_TITLE_MAX} کاراکتر`}
        />

        <div>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              متن اطلاعیه
            </span>
            <textarea
              name="content"
              value={form.values.content}
              onChange={form.handleChange}
              placeholder="جزئیات اطلاعیه را بنویسید..."
              rows={6}
              className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${
                form.errors.content ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
              }`}
            />
          </label>
          <div className="mt-2 flex items-start justify-between gap-3">
            {form.errors.content ? (
              <small className="text-xs font-medium text-rose-600">{form.errors.content}</small>
            ) : (
              <small className="text-xs font-medium leading-6 text-slate-500">
                این متن عیناً به ساکنان نمایش داده می‌شود.
              </small>
            )}
            <small
              className={`shrink-0 text-xs font-bold tabular-nums ${
                contentLength > ANNOUNCEMENT_CONTENT_MAX ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              {contentLength} از {ANNOUNCEMENT_CONTENT_MAX}
            </small>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <Toggle
            checked={form.values.is_active}
            onChange={(value) => form.setFieldValue('is_active', value)}
            disabled={form.loading}
            label="نمایش به ساکنان"
          />
          <p className="mt-2 text-xs leading-6 text-slate-500">
            {form.values.is_active
              ? 'این اطلاعیه در فهرست اطلاعیه‌های ساکنان دیده می‌شود.'
              : 'این اطلاعیه بایگانی می‌شود و ساکنان آن را نمی‌بینند.'}
          </p>
        </div>

        <ServerError error={form.serverError} />

        <PrimaryButton loading={form.loading}>
          {isEdit ? 'ذخیره تغییرات' : 'انتشار اطلاعیه'}
        </PrimaryButton>
      </form>
    </Modal>
  )
}
