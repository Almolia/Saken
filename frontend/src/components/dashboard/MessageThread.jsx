import { LoaderCircle, Send, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatDateTime, formatRelativeDate } from '../../utils/helpers'
import { ServerError } from '../ui/ServerError'

export function MessageThread({
  conversation,
  currentUserId,
  counterpartFallback,
  loading = false,
  error = '',
  onRetry,
  onReply,
}) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [replyError, setReplyError] = useState('')
  const bottomRef = useRef(null)
  const messages = conversation?.messages || []
  const counterpart = conversation?.counterpart_label || counterpartFallback || 'گفتگو'

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages.length, conversation?.id])

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) {
      setReplyError('متن پیام الزامی است.')
      return
    }
    setSending(true)
    setReplyError('')
    try {
      await onReply(trimmed)
      setBody('')
    } catch (submitError) {
      setReplyError(submitError.message || 'ارسال پاسخ ناموفق بود.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center gap-3 text-sm font-bold text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin text-teal-600" />
        در حال بارگذاری گفتگو...
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <ServerError error={error} />
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
          >
            تلاش مجدد
          </button>
        ) : null}
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex h-full min-h-80 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <UserRound className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-900">یک گفتگو را انتخاب کنید</h3>
        <p className="mt-2 max-w-sm text-sm leading-7 text-slate-500">
          از فهرست سمت راست گفتگویی را باز کنید تا پیام‌ها را بخوانید و پاسخ بدهید.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-80 flex-col">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-slate-950">{conversation.subject}</h3>
          {conversation.is_broadcast ? (
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-black text-teal-700">همگانی</span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-bold text-slate-500">{counterpart}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">هنوز پیامی در این گفتگو ثبت نشده است.</p>
        ) : (
          messages.map((item) => {
            const mine = item.sender?.id === currentUserId
            return (
              <article
                key={item.id}
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-7 shadow-sm ${
                  mine
                    ? 'mr-auto bg-teal-600 text-white'
                    : 'ml-auto bg-slate-100 text-slate-800'
                }`}
              >
                <div className={`mb-1 text-[11px] font-black ${mine ? 'text-teal-100' : 'text-slate-500'}`}>
                  {mine ? 'شما' : item.sender?.full_name || counterpart}
                </div>
                <p className="whitespace-pre-line">{item.body}</p>
                <time
                  className={`mt-2 block text-[11px] font-medium ${mine ? 'text-teal-100' : 'text-slate-400'}`}
                  dateTime={item.created_at}
                  title={formatDateTime(item.created_at)}
                >
                  {formatRelativeDate(item.created_at)}
                </time>
              </article>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="border-t border-slate-100 p-4 sm:p-5" onSubmit={handleSubmit}>
        {replyError ? <div className="mb-3"><ServerError error={replyError} /></div> : null}
        <div className="flex items-end gap-2">
          <textarea
            name="reply"
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              if (replyError) setReplyError('')
            }}
            rows={2}
            placeholder="پاسخ خود را بنویسید..."
            disabled={sending}
            className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ارسال
          </button>
        </div>
      </form>
    </div>
  )
}
