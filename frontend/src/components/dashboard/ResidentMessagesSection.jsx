import { ArrowRight, Building2, Inbox, MailPlus, MessagesSquare, MessageSquare, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { ComposeMessageModal } from './ComposeMessageModal'
import { DirectMessageModal } from './DirectMessageModal'
import { MessageThread } from './MessageThread'
import { LoadingBlock } from '../ui/LoadingBlock'
import { ServerError } from '../ui/ServerError'
import { SummaryCard } from '../ui/SummaryCard'
import { useConversationThread } from '../../hooks/useConversationThread'
import { residentMessageApi } from '../../lib/messagingApi'
import { formatRelativeDate } from '../../utils/helpers'

export function ResidentMessagesSection({
  conversations,
  loading,
  error,
  retry,
  upsertConversation,
  markConversationRead,
  currentUserId,
}) {
  const { showToast } = useToast()
  const [composerOpen, setComposerOpen] = useState(false)
  const [directMessageOpen, setDirectMessageOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const threadState = useConversationThread({
    conversationId: selectedId,
    fetchThread: residentMessageApi.thread,
    markRead: residentMessageApi.markRead,
    onMarkedRead: markConversationRead,
  })

  const selected = conversations.find((item) => item.id === selectedId) || null
  const unreadTotal = conversations.reduce((sum, item) => sum + (Number(item.unread_count) || 0), 0)

  function handleComposeSent(response) {
    if (response?.conversation) upsertConversation?.(response.conversation)
  }

  function handleDirectMessageSent(response) {
    if (response?.conversation) {
      upsertConversation?.(response.conversation)
      // Open the new conversation
      setSelectedId(response.conversation.id)
    }
  }

  async function handleReply(body) {
    if (!selectedId) return
    const response = await residentMessageApi.reply(selectedId, { body })
    if (response?.conversation) {
      threadState.replaceThread(response.conversation)
      upsertConversation?.({
        ...response.conversation,
        last_message_preview: body,
        unread_count: 0,
      })
    }
    showToast(response?.message || 'پاسخ با موفقیت ارسال شد.')
    return response
  }

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">ارتباط با مدیریت</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">پیام‌های شما</h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            سوال یا درخواست خود را برای مدیریت ساختمان بفرستید. پاسخ‌ها فقط در گفتگوی شما نمایش داده می‌شود و ساکنان دیگر آن را نمی‌بینند.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SummaryCard title="گفتگوها" value={loading ? '—' : conversations.length} icon={Inbox} tone="teal" />
        <SummaryCard title="خوانده‌نشده" value={loading ? '—' : unreadTotal} icon={MessagesSquare} tone="amber" />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">صندوق پیام‌ها</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? 'در حال دریافت اطلاعات...' : `${conversations.length} گفتگو ثبت شده است.`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirectMessageOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-700 shadow-sm transition hover:bg-teal-100"
            >
              <MessageSquare className="h-4 w-4" />
              پیام مستقیم
            </button>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
            >
              <MailPlus className="h-4 w-4" />
              پیام به مدیریت
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <div className="space-y-4 p-6">
            <ServerError error={error} />
            <button
              type="button"
              onClick={retry}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              تلاش مجدد
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">هنوز پیامی ندارید</h3>
            <p className="mt-2 text-sm text-slate-500">
              با دکمه «پیام به مدیریت» یا «پیام مستقیم» اولین پیام را بفرستید.
            </p>
          </div>
        ) : (
          <div className="grid min-h-[32rem] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <div className={`${selectedId ? 'hidden lg:block' : ''} border-l border-slate-100`}>
              <ul className="divide-y divide-slate-100">
                {conversations.map((item) => {
                  const active = item.id === selectedId
                  const unread = Number(item.unread_count) || 0
                  const isDirect = item.kind === 'direct'
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`flex w-full items-start gap-3 px-5 py-4 text-right transition ${
                          active ? 'bg-teal-50/80' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                          isDirect ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'
                        }`}>
                          {isDirect ? <UserRound className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-black text-slate-950">
                              {item.counterpart_label || (isDirect ? 'گفتگو' : 'مدیریت ساختمان')}
                            </p>
                            <time className="shrink-0 text-[11px] font-medium text-slate-400">
                              {formatRelativeDate(item.last_message_at)}
                            </time>
                          </div>
                          <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{item.subject}</p>
                          <p className="mt-1 truncate text-xs text-slate-400">{item.last_message_preview}</p>
                        </div>
                        {unread > 0 ? (
                          <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-[11px] font-black text-white">
                            {unread}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className={`${selectedId ? 'block' : 'hidden lg:block'} min-h-[32rem]`}>
              {selectedId ? (
                <div className="lg:hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="inline-flex items-center gap-2 px-5 pt-4 text-xs font-bold text-slate-500"
                  >
                    <ArrowRight className="h-4 w-4" />
                    بازگشت به فهرست
                  </button>
                </div>
              ) : null}
              <MessageThread
                conversation={threadState.thread}
                currentUserId={currentUserId}
                counterpartFallback={selected?.counterpart_label || (selected?.kind === 'direct' ? 'گفتگو' : 'مدیریت ساختمان')}
                loading={threadState.loading}
                error={threadState.error}
                onRetry={() => setSelectedId(selectedId)}
                onReply={handleReply}
              />
            </div>
          </div>
        )}
      </section>

      <ComposeMessageModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSent={handleComposeSent}
      />

      <DirectMessageModal
        open={directMessageOpen}
        onClose={() => setDirectMessageOpen(false)}
        onSent={handleDirectMessageSent}
      />
    </>
  )
}
