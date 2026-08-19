import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { residentMessageApi } from '../../lib/messagingApi'
import { ResidentMessagesSection } from './ResidentMessagesSection'

vi.mock('../../lib/messagingApi', () => ({
  residentMessageApi: {
    list: vi.fn(),
    create: vi.fn(),
    thread: vi.fn(),
    reply: vi.fn(),
    markRead: vi.fn(),
  },
}))

const conversation = {
  id: 4,
  kind: 'management',
  subject: 'نشتی سقف',
  counterpart_label: 'مدیریت ساختمان',
  last_message_preview: 'سقف واحد چکه می‌کند',
  last_message_at: '2026-08-17T09:00:00Z',
  unread_count: 1,
}

function renderSection(props = {}) {
  const upsertConversation = vi.fn()
  const markConversationRead = vi.fn()
  render(
    <ToastProvider>
      <ResidentMessagesSection
        conversations={props.conversations ?? [conversation]}
        loading={props.loading ?? false}
        error={props.error ?? ''}
        retry={props.retry ?? vi.fn()}
        upsertConversation={upsertConversation}
        markConversationRead={markConversationRead}
        currentUserId={7}
      />
    </ToastProvider>,
  )
  return { upsertConversation, markConversationRead }
}

describe('ResidentMessagesSection', () => {
  beforeEach(() => {
    residentMessageApi.create.mockReset()
    residentMessageApi.thread.mockReset()
    residentMessageApi.reply.mockReset()
    residentMessageApi.markRead.mockReset()
    residentMessageApi.thread.mockResolvedValue({
      conversation: {
        ...conversation,
        messages: [
          {
            id: 11,
            body: 'سقف واحد چکه می‌کند',
            created_at: '2026-08-17T09:00:00Z',
            sender: { id: 7, full_name: 'ساکن الف', role: 'resident' },
          },
        ],
      },
    })
    residentMessageApi.markRead.mockResolvedValue({ unread_count: 0 })
  })

  it('shows empty, loading and error states', () => {
    const { rerender } = render(
      <ToastProvider>
        <ResidentMessagesSection conversations={[]} loading error="" retry={vi.fn()} currentUserId={7} />
      </ToastProvider>,
    )
    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument()

    rerender(
      <ToastProvider>
        <ResidentMessagesSection conversations={[]} loading={false} error="خطای سرور" retry={vi.fn()} currentUserId={7} />
      </ToastProvider>,
    )
    expect(screen.getByText('خطای سرور')).toBeInTheDocument()

    rerender(
      <ToastProvider>
        <ResidentMessagesSection conversations={[]} loading={false} error="" retry={vi.fn()} currentUserId={7} />
      </ToastProvider>,
    )
    expect(screen.getByText('هنوز پیامی ندارید')).toBeInTheDocument()
  })

  it('labels the destination as building management and never shows a manager picker', async () => {
    const user = userEvent.setup()
    renderSection({ conversations: [] })

    await user.click(screen.getByRole('button', { name: 'پیام جدید' }))
    expect(screen.getByText('مدیریت ساختمان')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText(/انتخاب مدیر/)).not.toBeInTheDocument()
  })

  it('submits a new message to the resident endpoint', async () => {
    const user = userEvent.setup()
    residentMessageApi.create.mockResolvedValue({
      message: 'پیام شما با موفقیت برای مدیریت ارسال شد.',
      conversation,
    })
    const { upsertConversation } = renderSection({ conversations: [] })

    await user.click(screen.getByRole('button', { name: 'پیام جدید' }))
    await user.type(screen.getByLabelText(/موضوع پیام/), 'نشتی سقف')
    await user.type(screen.getByPlaceholderText(/پیام خود را برای مدیریت/), 'سقف واحد چکه می‌کند')
    await user.click(screen.getByRole('button', { name: 'ارسال پیام' }))

    await waitFor(() =>
      expect(residentMessageApi.create).toHaveBeenCalledWith({
        subject: 'نشتی سقف',
        body: 'سقف واحد چکه می‌کند',
      }),
    )
    expect(await screen.findByText('پیام شما با موفقیت برای مدیریت ارسال شد.')).toBeInTheDocument()
    expect(upsertConversation).toHaveBeenCalledWith(conversation)
  })

  it('shows an unread badge on the listed conversation', () => {
    renderSection()
    expect(screen.getByText('مدیریت ساختمان')).toBeInTheDocument()
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
  })
})
