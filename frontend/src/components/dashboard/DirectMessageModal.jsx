import { LoaderCircle, Search, Send, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../ToastProvider'
import { Modal } from '../ui/Modal'
import { ServerError } from '../ui/ServerError'
import { directMessageApi, getRoleLabel } from '../../lib/messagingApi'
import { MESSAGE_BODY_MAX, MESSAGE_SUBJECT_MAX, validateMessage } from '../../lib/validators'

export function DirectMessageModal({ open, onClose, onSent }) {
  if (!open) return null
  return <DirectMessageModalContent onClose={onClose} onSent={onSent} />
}

function DirectMessageModalContent({ onClose, onSent }) {
  const { showToast } = useToast()
  const [recipients, setRecipients] = useState([])
  const [loadingRecipients, setLoadingRecipients] = useState(true)
  const [recipientsError, setRecipientsError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedRecipient, setSelectedRecipient] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return

    const fetchRecipients = async () => {
      setLoadingRecipients(true)
      setRecipientsError('')
      try {
        const data = await directMessageApi.recipients()
        setRecipients(data?.recipients || [])
      } catch (error) {
        setRecipientsError(error.message || 'خطا در دریافت فهرست گیرندگان.')
      } finally {
        setLoadingRecipients(false)
      }
    }

    fetchRecipients()
  }, [])

  function handleSelectRecipient(recipient) {
    setSelectedRecipient(recipient)
    setFieldErrors({})
  }

  function handleBackToRecipients() {
    setSelectedRecipient(null)
    setSubject('')
    setBody('')
    setFieldErrors({})
    setServerError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const errors = validateMessage({ subject, body })
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSending(true)
    try {
      const response = await directMessageApi.send({
        user_id: selectedRecipient.id,
        subject: subject.trim(),
        body: body.trim(),
      })
      onSent?.(response)
      showToast(response?.message || 'پیام مستقیم با موفقیت ارسال شد.')
      onClose()
    } catch (error) {
      const message = error.message || 'ارسال پیام ناموفق بود.'
      setServerError(message)
      showToast(message, 'error')
    } finally {
      setSending(false)
    }
  }

  // Filter recipients based on search
  const filteredRecipients = recipients.filter((recipient) => {
    const query = searchQuery.toLowerCase()
    return (
      recipient.full_name.toLowerCase().includes(query) ||
      getRoleLabel(recipient.role).toLowerCase().includes(query)
    )
  })

  const subjectLength = subject.trim().length
  const bodyLength = body.trim().length

  // Step 1: Select recipient
  if (!selectedRecipient) {
    return (
      <Modal
        open
        title="پیام مستقیم جدید"
        description="گیرنده را انتخاب کنید."
        onClose={onClose}
        loading={loadingRecipients}
        closeOnBackdrop={false}
        size="lg"
      >
        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </div>

          {loadingRecipients ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm font-bold text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin text-teal-600" />
              در حال دریافت فهرست...
            </div>
          ) : recipientsError ? (
            <div className="py-8 text-center">
              <ServerError error={recipientsError} />
              <button
                type="button"
                onClick={() => {
                  setLoadingRecipients(true)
                  setRecipientsError('')
                  directMessageApi
                    .recipients()
                    .then((data) => setRecipients(data?.recipients || []))
                    .catch((error) => setRecipientsError(error.message || 'خطا'))
                    .finally(() => setLoadingRecipients(false))
                }}
                className="mt-4 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
              >
                تلاش مجدد
              </button>
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">
                {searchQuery ? 'هیچ نتیجه‌ای یافت نشد.' : 'هیچ گیرنده‌ای موجود نیست.'}
              </p>
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200">
              {filteredRecipients.map((recipient) => (
                <li key={recipient.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectRecipient(recipient)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-right transition hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950">
                        {recipient.full_name}
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        {getRoleLabel(recipient.role)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              انصراف
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // Step 2: Compose message
  return (
    <Modal
      open
      title={`پیام به ${selectedRecipient.full_name}`}
      description={`${getRoleLabel(selectedRecipient.role)} - پیام خصوصی`}
      onClose={onClose}
      loading={sending}
      closeOnBackdrop={false}
    >
      <button
        type="button"
        onClick={handleBackToRecipients}
        className="mb-4 text-xs font-bold text-slate-500 hover:text-teal-600"
      >
        ← تغییر گیرنده
      </button>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {/* Selected recipient indicator */}
        <div className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-teal-700">گیرنده</p>
            <p className="text-sm font-black text-slate-950">{selectedRecipient.full_name}</p>
          </div>
        </div>

        <div>
          <label htmlFor="direct-subject" className="mb-2 block text-sm font-bold text-slate-700">
            موضوع پیام
          </label>
          <input
            id="direct-subject"
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              if (fieldErrors.subject) setFieldErrors((prev) => ({ ...prev, subject: '' }))
            }}
            placeholder="موضوع پیام..."
            className={`w-full rounded-2xl border bg-white px-4 py-2.5 text-sm outline-none transition ${
              fieldErrors.subject
                ? 'border-rose-300 bg-rose-50/40'
                : 'border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100'
            }`}
          />
          {fieldErrors.subject && (
            <small className="mt-1 block text-xs font-medium text-rose-600">
              {fieldErrors.subject}
            </small>
          )}
          <small className="mt-1 block text-xs text-slate-400">
            {subjectLength} از {MESSAGE_SUBJECT_MAX}
          </small>
        </div>

        <div>
          <label htmlFor="direct-body" className="mb-2 block text-sm font-bold text-slate-700">
            متن پیام
          </label>
          <textarea
            id="direct-body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              if (fieldErrors.body) setFieldErrors((prev) => ({ ...prev, body: '' }))
            }}
            placeholder="پیام خود را بنویسید..."
            rows={6}
            className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-medium leading-7 outline-none transition placeholder:text-slate-400 ${
              fieldErrors.body
                ? 'border-rose-300 bg-rose-50/40'
                : 'border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100'
            }`}
          />
          <div className="mt-2 flex items-start justify-between gap-3">
            {fieldErrors.body ? (
              <small className="text-xs font-medium text-rose-600">{fieldErrors.body}</small>
            ) : (
              <small className="text-xs font-medium leading-6 text-slate-500">
                این پیام فقط برای {selectedRecipient.full_name} قابل مشاهده خواهد بود.
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
        </div>

        <ServerError error={serverError} />

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'در حال ارسال...' : 'ارسال پیام'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            انصراف
          </button>
        </div>
      </form>
    </Modal>
  )
}
