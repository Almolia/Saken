import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/ToastProvider'
import { managerApi } from '../../../lib/api'
import { managerMessageApi } from '../../../lib/messagingApi'
import { MessagesSection } from './MessagesSection'

vi.mock('../../../lib/api', () => ({
  managerApi: {
    units: vi.fn(),
  },
}))

vi.mock('../../../lib/messagingApi', () => ({
  managerMessageApi: {
    list: vi.fn(),
    broadcast: vi.fn(),
    thread: vi.fn(),
    reply: vi.fn(),
    markRead: vi.fn(),
  },
}))

const conversation = {
  id: 8,
  kind: 'management',
  subject: 'قطع آب',
  is_broadcast: true,
  counterpart_label: 'ساکن الف',
  resident_name: 'ساکن الف',
  last_message_preview: 'آب فردا قطع است',
  last_message_at: '2026-08-17T09:00:00Z',
  unread_count: 1,
}

function renderSection(props = {}) {
  const upsertConversations = vi.fn()
  const markConversationRead = vi.fn()
  render(
    <ToastProvider>
      <MessagesSection
        conversations={props.conversations ?? [conversation]}
        loading={props.loading ?? false}
        error={props.error ?? ''}
        retry={props.retry ?? vi.fn()}
        upsertConversations={upsertConversations}
        markConversationRead={markConversationRead}
        currentUserId={1}
      />
    </ToastProvider>,
  )
  return { upsertConversations, markConversationRead }
}

describe('MessagesSection', () => {
  beforeEach(() => {
    managerApi.units.mockReset()
    managerApi.units.mockResolvedValue({
      units: [{ id: 3, unit_number: '101', floor: 1, owner: { id: 9, full_name: 'ساکن الف' } }],
    })
    managerMessageApi.broadcast.mockReset()
    managerMessageApi.thread.mockReset()
    managerMessageApi.reply.mockReset()
    managerMessageApi.markRead.mockReset()
    managerMessageApi.thread.mockResolvedValue({
      conversation: {
        ...conversation,
        messages: [
          {
            id: 21,
            body: 'آب فردا قطع است',
            created_at: '2026-08-17T09:00:00Z',
            sender: { id: 1, full_name: 'مدیر ساختمان', role: 'manager' },
          },
        ],
      },
    })
    managerMessageApi.markRead.mockResolvedValue({ message: 'ok' })
  })

  it('shows loading, error and empty states', async () => {
    const { rerender } = render(
      <ToastProvider>
        <MessagesSection conversations={[]} loading error="" retry={vi.fn()} currentUserId={1} />
      </ToastProvider>,
    )
    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument()

    const retry = vi.fn()
    rerender(
      <ToastProvider>
        <MessagesSection conversations={[]} loading={false} error="خطای سرور" retry={retry} currentUserId={1} />
      </ToastProvider>,
    )
    expect(screen.getByText('خطای سرور')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'تلاش مجدد' }))
    expect(retry).toHaveBeenCalledTimes(1)

    rerender(
      <ToastProvider>
        <MessagesSection conversations={[]} loading={false} error="" retry={vi.fn()} currentUserId={1} />
      </ToastProvider>,
    )
    expect(screen.getByText('هنوز گفتگویی وجود ندارد')).toBeInTheDocument()
  })

  it('renders the inbox with the resident as the counterpart', () => {
    renderSection()
    expect(screen.getByText('ساکن الف')).toBeInTheDocument()
    expect(screen.getByText('قطع آب')).toBeInTheDocument()
    expect(screen.getByText('آب فردا قطع است')).toBeInTheDocument()
    expect(screen.queryByText('گفتگوی خصوصی من')).not.toBeInTheDocument()
  })

  it('opens a thread, marks it read and sends a manager reply', async () => {
    const user = userEvent.setup()
    managerMessageApi.reply.mockResolvedValue({
      message: 'پاسخ با موفقیت ارسال شد.',
      conversation: {
        ...conversation,
        unread_count: 0,
        last_message_preview: 'ساعت قطعی به ۸ تغییر کرد.',
        messages: [
          {
            id: 21,
            body: 'آب فردا قطع است',
            created_at: '2026-08-17T09:00:00Z',
            sender: { id: 1, full_name: 'مدیر ساختمان', role: 'manager' },
          },
          {
            id: 22,
            body: 'ساعت قطعی به ۸ تغییر کرد.',
            created_at: '2026-08-17T10:00:00Z',
            sender: { id: 1, full_name: 'مدیر ساختمان', role: 'manager' },
          },
        ],
      },
    })
    const { markConversationRead, upsertConversations } = renderSection()

    await user.click(screen.getByRole('button', { name: /ساکن الف/ }))
    expect(await screen.findByPlaceholderText('پاسخ خود را بنویسید...')).toBeInTheDocument()
    await waitFor(() => expect(managerMessageApi.markRead).toHaveBeenCalledWith(8))
    expect(markConversationRead).toHaveBeenCalledWith(8)

    await user.type(screen.getByPlaceholderText('پاسخ خود را بنویسید...'), 'ساعت قطعی به ۸ تغییر کرد.')
    await user.click(screen.getByRole('button', { name: 'ارسال' }))

    await waitFor(() =>
      expect(managerMessageApi.reply).toHaveBeenCalledWith(8, { body: 'ساعت قطعی به ۸ تغییر کرد.' }),
    )
    expect(await screen.findByText('پاسخ با موفقیت ارسال شد.')).toBeInTheDocument()
    expect(upsertConversations).toHaveBeenCalled()
  })

  it('submits a broadcast from the composer modal', async () => {
    const user = userEvent.setup()
    managerMessageApi.broadcast.mockResolvedValue({
      message: 'پیام همگانی با موفقیت برای 1 ساکن ارسال شد.',
      conversations: [conversation],
    })
    const { upsertConversations } = renderSection({ conversations: [] })

    await user.click(screen.getByRole('button', { name: 'پیام همگانی' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/موضوع پیام/), 'قطع آب')
    await user.type(within(dialog).getByPlaceholderText(/متن پیام همگانی/), 'آب ساختمان فردا قطع خواهد بود.')
    await user.click(within(dialog).getByRole('button', { name: 'ارسال پیام همگانی' }))

    await waitFor(() =>
      expect(managerMessageApi.broadcast).toHaveBeenCalledWith({
        subject: 'قطع آب',
        body: 'آب ساختمان فردا قطع خواهد بود.',
        unit_ids: [],
      }),
    )
    expect(await screen.findByText('پیام همگانی با موفقیت برای 1 ساکن ارسال شد.')).toBeInTheDocument()
    expect(upsertConversations).toHaveBeenCalledWith([conversation])
  })
})
