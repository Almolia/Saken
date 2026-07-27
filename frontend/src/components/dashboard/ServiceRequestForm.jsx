import { CircleAlert, ClipboardPlus, LoaderCircle, Send } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { serviceRequestApi } from '../../lib/serviceRequestApi'

const initialValues = { title: '', description: '' }

function validate(values) {
  const errors = {}
  const title = values.title.trim()
  const description = values.description.trim()

  if (!title) {
    errors.title = 'عنوان درخواست را وارد کنید.'
  } else if (title.length > 255) {
    errors.title = 'عنوان درخواست نمی‌تواند بیشتر از ۲۵۵ کاراکتر باشد.'
  }

  if (!description) {
    errors.description = 'شرح مشکل را وارد کنید.'
  }

  return errors
}

export function ServiceRequestForm({ onRequestCreated }) {
  const { showToast } = useToast()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setServerError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setServerError('')

    try {
      const serviceRequest = await serviceRequestApi.create({
        title: values.title.trim(),
        description: values.description.trim(),
      })
      onRequestCreated(serviceRequest)
      setValues(initialValues)
      showToast('درخواست خدمات شما با موفقیت ثبت شد.')
    } catch (error) {
      const message = error.message || 'ثبت درخواست خدمات ناموفق بود. لطفاً دوباره تلاش کنید.'
      setServerError(message)
      showToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="service-request-form-title"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <ClipboardPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 id="service-request-form-title" className="text-lg font-black text-slate-950">
            ثبت درخواست خدمات
          </h2>
          <p className="mt-1 text-sm leading-7 text-slate-500">
            مشکل تعمیراتی واحد یا بخش‌های مشترک ساختمان را برای پیگیری ثبت کنید.
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        <label className="block" htmlFor="service-request-title">
          <span className="mb-2 block text-sm font-bold text-slate-700">عنوان درخواست</span>
          <input
            id="service-request-title"
            name="title"
            type="text"
            value={values.title}
            onChange={handleChange}
            placeholder="مثلاً نشتی شیر آب آشپزخانه"
            maxLength={255}
            disabled={submitting}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'service-request-title-error' : undefined}
            className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${
              errors.title ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
            }`}
          />
          {errors.title ? (
            <small id="service-request-title-error" className="mt-2 block text-xs font-medium text-rose-600">
              {errors.title}
            </small>
          ) : null}
        </label>

        <label className="block" htmlFor="service-request-description">
          <span className="mb-2 block text-sm font-bold text-slate-700">شرح مشکل</span>
          <textarea
            id="service-request-description"
            name="description"
            value={values.description}
            onChange={handleChange}
            placeholder="جزئیات مشکل، محل آن و زمان مناسب برای مراجعه را بنویسید."
            rows={5}
            disabled={submitting}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'service-request-description-error' : undefined}
            className={`w-full resize-y rounded-2xl border bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${
              errors.description ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
            }`}
          />
          {errors.description ? (
            <small id="service-request-description-error" className="mt-2 block text-xs font-medium text-rose-600">
              {errors.description}
            </small>
          ) : null}
        </label>

        {serverError ? (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium leading-7 text-rose-700" role="alert">
            <CircleAlert className="mt-1 h-4 w-4 shrink-0" />
            <p>{serverError}</p>
          </div>
        ) : null}

        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-300/70 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={submitting}
        >
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'در حال ثبت درخواست...' : 'ثبت درخواست'}
        </button>
      </form>
    </section>
  )
}
