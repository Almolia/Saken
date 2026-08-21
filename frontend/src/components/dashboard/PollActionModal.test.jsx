import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { managerPollApi } from '../../lib/pollApi'
import { PollActionModal } from './PollActionModal'
import { PollAction } from '../../utils/polls'

vi.mock('../../lib/pollApi', () => ({
  managerPollApi: {
    publish: vi.fn(),
    close: vi.fn(),
    remove: vi.fn(),
  },
}))

const draft = {
  id: 4,
  title: 'رنگ نمای جدید ساختمان کدام باشد؟',
  status: 'Draft',
  ends_at: '2026-09-06T20:30:00Z',
  target_units: [7, 8],
  options: [
    { id: 1, text: 'کرم', position: 0 },
    { id: 2, text: 'خاکستری', position: 1 },
  ],
}

const active = { ...draft, status: 'Active' }

function renderModal(props = {}) {
  const onClose = props.onClose ?? vi.fn()
  const onReplaced = props.onReplaced ?? vi.fn()
  const onRemoved = props.onRemoved ?? vi.fn()
  render(
    <ToastProvider>
      <PollActionModal
        open
        poll={draft}
        onClose={onClose}
        onReplaced={onReplaced}
        onRemoved={onRemoved}
        {...props}
      />
    </ToastProvider>,
  )
  return { onClose, onReplaced, onRemoved }
}

describe('PollActionModal', () => {
  beforeEach(() => {
    managerPollApi.publish.mockReset()
    managerPollApi.close.mockReset()
    managerPollApi.remove.mockReset()
  })

  it('renders nothing without a poll or a known action', () => {
    render(
      <ToastProvider>
        <PollActionModal open action={PollAction.PUBLISH} poll={null} onClose={vi.fn()} />
      </ToastProvider>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows what is about to be published before publishing it', () => {
    renderModal({ action: PollAction.PUBLISH })

    expect(screen.getByRole('heading', { name: 'انتشار نظرسنجی' })).toBeInTheDocument()
    expect(screen.getByText(draft.title)).toBeInTheDocument()
    expect(screen.getByText('2 گزینه')).toBeInTheDocument()
    expect(screen.getByText('2 واحد منتخب')).toBeInTheDocument()
    expect(screen.getByText(/پس از انتشار، پرسش و گزینه‌ها دیگر قابل ویرایش نیستند/)).toBeInTheDocument()
  })

  it('publishes the draft and hands the updated poll back', async () => {
    const user = userEvent.setup()
    const published = { ...draft, status: 'Active' }
    managerPollApi.publish.mockResolvedValue({
      message: 'نظرسنجی با موفقیت منتشر شد.',
      poll: published,
    })
    const { onReplaced, onClose } = renderModal({ action: PollAction.PUBLISH })

    await user.click(screen.getByRole('button', { name: 'بله، منتشر شود' }))

    await waitFor(() => expect(managerPollApi.publish).toHaveBeenCalledWith(4))
    expect(onReplaced).toHaveBeenCalledWith(published)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('نظرسنجی با موفقیت منتشر شد.')).toBeInTheDocument()
  })

  it('warns that a closed poll never reopens', async () => {
    const user = userEvent.setup()
    managerPollApi.close.mockResolvedValue({
      message: 'نظرسنجی با موفقیت بسته شد.',
      poll: { ...active, status: 'Closed' },
    })
    const { onReplaced } = renderModal({ action: PollAction.CLOSE, poll: active })

    expect(screen.getByText(/نظرسنجی بسته‌شده دوباره باز نمی‌شود/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'بله، نظرسنجی بسته شود' }))

    await waitFor(() => expect(managerPollApi.close).toHaveBeenCalledWith(4))
    expect(onReplaced).toHaveBeenCalledWith(expect.objectContaining({ status: 'Closed' }))
  })

  it('deletes a draft and reports only its id back', async () => {
    const user = userEvent.setup()
    managerPollApi.remove.mockResolvedValue({ message: 'نظرسنجی با موفقیت حذف شد.' })
    const { onRemoved, onReplaced } = renderModal({ action: PollAction.DELETE })

    await user.click(screen.getByRole('button', { name: 'بله، پیش‌نویس حذف شود' }))

    await waitFor(() => expect(managerPollApi.remove).toHaveBeenCalledWith(4))
    expect(onRemoved).toHaveBeenCalledWith(4)
    expect(onReplaced).not.toHaveBeenCalled()
  })

  it('keeps the modal open and shows the reason when the server refuses', async () => {
    const user = userEvent.setup()
    managerPollApi.remove.mockRejectedValue(
      new Error('فقط نظرسنجی‌های در وضعیت پیش‌نویس قابل حذف هستند؛ نظرسنجی منتشرشده را ببندید.'),
    )
    const { onClose, onRemoved } = renderModal({ action: PollAction.DELETE })

    await user.click(screen.getByRole('button', { name: 'بله، پیش‌نویس حذف شود' }))

    // The reason lands both in the toast and inline in the dialog, so the poll
    // is still on screen to try again from.
    const alert = await within(screen.getByRole('dialog')).findByRole('alert')
    expect(alert).toHaveTextContent(
      'فقط نظرسنجی‌های در وضعیت پیش‌نویس قابل حذف هستند؛ نظرسنجی منتشرشده را ببندید.',
    )
    expect(onRemoved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('leaves without calling the API when the manager backs out', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal({ action: PollAction.DELETE })

    await user.click(screen.getByRole('button', { name: 'انصراف' }))

    expect(managerPollApi.remove).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
