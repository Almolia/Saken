import { Send, LoaderCircle, Building2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { InputField } from '../ui/InputField'
import { ServerError } from '../ui/ServerError'
import { residentMessageApi } from '../../lib/messagingApi'
import { MESSAGE_BODY_MAX, MESSAGE_SUBJECT_MAX, validateMessage } from '../../lib/validators'

export function ComposeMessageModal({ open, onClose, onSent }) {
  if (!open) return null
  return <ComposeMessageModalContent onClose={onClose} onSent={onSent} />
}

function ComposeMessageModalContent({ onClose, onSent }) {
  const { showToast } = useToast()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const errors = validateMessage({ subject, body })
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setLoading(true)
    try {
      const response = await residentMessageApi.create({
        subject: subject.trim(),
        body: body.trim(),
      })
      onSent?.(response)
      showToast(response?.message || 'پیام شما با موفقیت برای مدیریت ارسال شد.')
      onClose()
    } catch (error) {
      const message = error.message || 'ارسال پیام ناموفق بود.'
      setServerError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const subjectLength = subject.trim().length
  const bodyLength = body.trim().length

  return (
    <Modal
      open
      title="پیام جدید به مدیریت"
      description="موضوع و متن پیام را بنویسید. پیام فقط برای مدیریت ساختمان ارسال می‌شود."
      onClose={onClose}
      loading={loading}
      closeOnBackdrop={false}
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-teal-700">گیرنده</p>
            <p className="text-sm font-black text-slate-950">مدیریت ساختمان</p>
          </div>
        </div>

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
          placeholder="مثلاً: نشتی سقف واحد"
          helper={`${subjectLength} از ${MESSAGE_SUBJECT_MAX} کاراکتر`}
        />

        <label className="block" htmlFor="compose-message-body">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">متن پیام</span>
          <textarea
            id="compose-message-body"
            name="body"
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              if (fieldErrors.body) setFieldErrors((current) => ({ ...current, body: '' }))
            }}
            placeholder="پیام خود را برای مدیریت ساختمان بنویسید..."
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
                این گفتگو فقط بین شما و مدیریت ساختمان است.
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

        <ServerError error={serverError} />

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? 'در حال ارسال...' : 'ارسال پیام'}
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
