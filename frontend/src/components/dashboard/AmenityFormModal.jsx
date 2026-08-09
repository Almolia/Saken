import { Modal } from '../ui/Modal'
import { InputField } from '../ui/InputField'
import { PrimaryButton } from '../ui/PrimaryButton'
import { ServerError } from '../ui/ServerError'
import { Toggle } from '../ui/Toggle'
import { useForm } from '../../hooks/useForm'
import { validateAmenity } from '../../lib/validators'

export function AmenityFormModal({ open, onClose, amenity, onSubmit }) {
  const isEdit = Boolean(amenity?.id)

  const form = useForm({
    initialValues: {
      name: amenity?.name ?? '',
      description: amenity?.description ?? '',
      operating_rules: amenity?.operating_rules ?? '',
      is_active: amenity?.is_active ?? true,
    },
    validate: validateAmenity,
    onSubmit: async (values) => {
      await onSubmit({
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
        operating_rules: values.operating_rules.trim(),
      })
      onClose()
    },
  })

  // Update form values when amenity changes
  if (open && amenity && form.values.name !== (amenity.name ?? '') && !form.loading) {
    form.setValues({
      name: amenity.name ?? '',
      description: amenity.description ?? '',
      operating_rules: amenity.operating_rules ?? '',
      is_active: amenity.is_active ?? true,
    })
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'ویرایش امکان' : 'افزودن امکان جدید'}
      description={
        isEdit
          ? 'مشخصات امکان را ویرایش کنید.'
          : 'مشخصات امکان جدید را وارد کنید.'
      }
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit}>
        <InputField
          label="نام امکان"
          name="name"
          type="text"
          value={form.values.name}
          onChange={form.handleChange}
          error={form.errors.name}
          placeholder="مثلاً: باشگاه ورزشی، پارکینگ، فضای سبز"
        />

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            توضیحات
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500">اختیاری</span>
          </span>
          <textarea
            name="description"
            value={form.values.description}
            onChange={form.handleChange}
            placeholder="توضیحات مربوط به این امکان..."
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
          />
        </label>

        <InputField
          label="قوانین و ساعات کاری"
          name="operating_rules"
          type="text"
          value={form.values.operating_rules}
          onChange={form.handleChange}
          placeholder="مثلاً: 08:00 تا 22:00 - شنبه تا پنج‌شنبه"
          helper="قوانین استفاده و ساعات دسترسی به این امکان"
        />

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <Toggle
            checked={form.values.is_active}
            onChange={(value) => form.setFieldValue('is_active', value)}
            label="وضعیت فعال بودن"
          />
          <p className="mt-2 text-xs text-slate-500">
            {form.values.is_active
              ? 'این امکان برای استفاده ساکنان فعال است.'
              : 'این امکان غیرفعال است (مثلاً به دلیل تعمیرات).'}
          </p>
        </div>

        <ServerError error={form.serverError} />
        <PrimaryButton loading={form.loading}>
          {isEdit ? 'ذخیره تغییرات' : 'افزودن امکان'}
        </PrimaryButton>
      </form>
    </Modal>
  )
}
