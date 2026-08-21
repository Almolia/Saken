import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { residentPollApi } from '../../lib/pollApi'
import { ResidentPollsSection } from './ResidentPollsSection'

vi.mock('../../lib/pollApi', () => ({
  residentPollApi: { list: vi.fn(), vote: vi.fn() },
}))

const NOW = new Date('2026-08-20T09:00:00Z')

const openPoll = {
  id: 2,
  title: 'ساعت تخلیه زباله کدام باشد؟',
  description: 'برای هماهنگی با شهرداری',
  starts_at: '2026-08-18T09:00:00Z',
  ends_at: '2026-08-25T12:00:00Z',
  options: [
    { id: 3, text: 'ساعت ۸ صبح', position: 0 },
    { id: 4, text: 'ساعت ۸ شب', position: 1 },
  ],
  has_voted: false,
  selected_option_id: null,
}

const votedPoll = {
  id: 1,
  title: 'رنگ نمای ساختمان',
  description: '',
  starts_at: '2026-08-18T09:00:00Z',
  ends_at: '2026-09-10T12:00:00Z',
  options: [
    { id: 1, text: 'کرم', position: 0 },
    { id: 2, text: 'خاکستری', position: 1 },
  ],
  has_voted: true,
  selected_option_id: 2,
}

function renderSection(props = {}) {
  const refresh = props.refresh ?? vi.fn()
  const markVoted = props.markVoted ?? vi.fn()
  render(
    <ToastProvider>
      <ResidentPollsSection
        polls={[openPoll]}
        loading={false}
        refreshing={false}
        error=""
        refresh={refresh}
        markVoted={markVoted}
        pendingCount={1}
        {...props}
      />
    </ToastProvider>,
  )
  return { refresh, markVoted }
}

const card = (title) => within(screen.getByRole('article', { name: title }))
const submitButton = () => screen.getByRole('button', { name: /ثبت رأی/ })

describe('ResidentPollsSection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW })
    residentPollApi.vote.mockReset()
    residentPollApi.vote.mockResolvedValue({ message: 'رأی شما با موفقیت ثبت شد.' })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the loading state before the polls arrive', () => {
    renderSection({ loading: true, polls: [] })

    expect(screen.getByRole('status', { name: 'در حال بارگذاری نظرسنجی‌ها' })).toBeInTheDocument()
  })

  it('renders each poll with its question, description, deadline and options', () => {
    renderSection()

    expect(screen.getByText('ساعت تخلیه زباله کدام باشد؟')).toBeInTheDocument()
    expect(screen.getByText('برای هماهنگی با شهرداری')).toBeInTheDocument()
    expect(screen.getByText(/پایان:/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'ساعت ۸ صبح' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'ساعت ۸ شب' })).toBeInTheDocument()
  })

  it('says how many polls are waiting for a vote', () => {
    renderSection({ pendingCount: 2 })

    expect(
      screen.getByText(/2 نظرسنجی در انتظار رأی شماست/),
    ).toBeInTheDocument()
  })

  it('keeps the submit disabled until an option is picked', async () => {
    const user = userEvent.setup()
    renderSection()

    expect(submitButton()).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: 'ساعت ۸ شب' }))

    expect(submitButton()).toBeEnabled()
  })

  it('sends the chosen option and marks the card voted without refetching', async () => {
    const user = userEvent.setup()
    const { markVoted, refresh } = renderSection()

    await user.click(screen.getByRole('radio', { name: 'ساعت ۸ شب' }))
    await user.click(submitButton())

    await waitFor(() => expect(residentPollApi.vote).toHaveBeenCalledWith(2, 4))
    expect(markVoted).toHaveBeenCalledWith(2, 4)
    expect(refresh).not.toHaveBeenCalled()
    expect(await screen.findByText('رأی شما با موفقیت ثبت شد.')).toBeInTheDocument()
  })

  it('locks the options while the vote is in flight', async () => {
    const user = userEvent.setup()
    residentPollApi.vote.mockReturnValue(new Promise(() => {}))
    renderSection()

    await user.click(screen.getByRole('radio', { name: 'ساعت ۸ صبح' }))
    await user.click(submitButton())

    await waitFor(() => expect(residentPollApi.vote).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('radio', { name: 'ساعت ۸ صبح' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /در حال ثبت رأی/ })).toBeDisabled()
  })

  it('does not send a second vote while the first is still in flight', async () => {
    const user = userEvent.setup()
    residentPollApi.vote.mockReturnValue(new Promise(() => {}))
    renderSection()

    await user.click(screen.getByRole('radio', { name: 'ساعت ۸ صبح' }))
    await user.click(submitButton())
    await waitFor(() => expect(residentPollApi.vote).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: /در حال ثبت رأی/ }))

    expect(residentPollApi.vote).toHaveBeenCalledTimes(1)
  })

  it('reports a refused vote and re-reads the list', async () => {
    const user = userEvent.setup()
    residentPollApi.vote.mockRejectedValue(new Error('شما قبلاً در این نظرسنجی رأی داده‌اید.'))
    const { markVoted, refresh } = renderSection()

    await user.click(screen.getByRole('radio', { name: 'ساعت ۸ صبح' }))
    await user.click(submitButton())

    expect(await screen.findByText('شما قبلاً در این نظرسنجی رأی داده‌اید.')).toBeInTheDocument()
    expect(markVoted).not.toHaveBeenCalled()
    // The card was out of date, so the list is re-read rather than left with a
    // button that would only fail again.
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('lets the resident try again after a failed vote', async () => {
    const user = userEvent.setup()
    residentPollApi.vote.mockRejectedValueOnce(new Error('ارتباط با سرور برقرار نشد.'))
    renderSection()

    await user.click(screen.getByRole('radio', { name: 'ساعت ۸ صبح' }))
    await user.click(submitButton())

    await waitFor(() => expect(submitButton()).toBeEnabled())
    expect(screen.getByRole('radio', { name: 'ساعت ۸ صبح' })).toBeEnabled()
  })

  it('shows an already-voted poll as answered, with the chosen option', () => {
    renderSection({ polls: [votedPoll], pendingCount: 0 })

    const voted = card('رنگ نمای ساختمان')
    expect(voted.getByText('رأی شما ثبت شد')).toBeInTheDocument()
    expect(voted.getByRole('radio', { name: /خاکستری/ })).toBeChecked()
    expect(voted.getByText('رأی شما')).toBeInTheDocument()
    expect(voted.getByText(/رأی شما در این نظرسنجی ثبت شده است و قابل تغییر نیست/)).toBeInTheDocument()
  })

  it('offers no way to change an answered poll', () => {
    renderSection({ polls: [votedPoll], pendingCount: 0 })

    expect(screen.queryByRole('button', { name: /ثبت رأی/ })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /کرم/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /خاکستری/ })).toBeDisabled()
  })

  it('closes voting on a poll whose deadline passed while the page was open', () => {
    renderSection({ polls: [{ ...openPoll, ends_at: '2026-08-19T12:00:00Z' }] })

    expect(screen.getByText('مهلت تمام شد')).toBeInTheDocument()
    expect(screen.getByText(/مهلت رأی‌گیری این نظرسنجی به پایان رسیده/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ثبت رأی/ })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'ساعت ۸ صبح' })).toBeDisabled()
  })

  it('keeps each poll voting independently of the others', async () => {
    const user = userEvent.setup()
    renderSection({ polls: [openPoll, votedPoll], pendingCount: 1 })

    // Only the unanswered poll offers a submit.
    expect(screen.getAllByRole('button', { name: /ثبت رأی/ })).toHaveLength(1)

    await user.click(screen.getByRole('radio', { name: 'ساعت ۸ صبح' }))
    await user.click(submitButton())

    await waitFor(() => expect(residentPollApi.vote).toHaveBeenCalledWith(2, 3))
  })

  it('tells the resident plainly when nothing is open', () => {
    renderSection({ polls: [], pendingCount: 0 })

    expect(screen.getByText('در حال حاضر نظرسنجی بازی وجود ندارد')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ثبت رأی/ })).not.toBeInTheDocument()
  })

  it('offers a retry when the first read fails', async () => {
    const user = userEvent.setup()
    const { refresh } = renderSection({ polls: [], error: 'خطایی در ارتباط با سرور رخ داد.' })

    expect(screen.getByText('دریافت نظرسنجی‌ها ناموفق بود')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تلاش مجدد' }))

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('keeps the cards on screen when a refresh fails', () => {
    renderSection({ error: 'خطایی در ارتباط با سرور رخ داد.' })

    expect(screen.getByText('ساعت تخلیه زباله کدام باشد؟')).toBeInTheDocument()
    expect(screen.getByText(/فهرست قبلی همچنان نمایش داده می‌شود/)).toBeInTheDocument()
    expect(screen.queryByText('دریافت نظرسنجی‌ها ناموفق بود')).not.toBeInTheDocument()
  })

  it('re-reads the list on demand', async () => {
    const user = userEvent.setup()
    const { refresh } = renderSection()

    await user.click(screen.getByRole('button', { name: 'به‌روزرسانی نظرسنجی‌ها' }))

    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
