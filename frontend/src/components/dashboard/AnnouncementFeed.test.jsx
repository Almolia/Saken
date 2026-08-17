import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { residentAnnouncementApi } from '../../lib/announcementApi'
import { formatDate } from '../../utils/helpers'
import { AnnouncementFeed } from './AnnouncementFeed'

vi.mock('../../lib/announcementApi', () => ({
  residentAnnouncementApi: {
    list: vi.fn(),
  },
}))

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
const daysAgo = (days) => hoursAgo(days * 24)

const fresh = {
  id: 3,
  title: 'قطع آب ساختمان',
  content: 'آب ساختمان فردا از ساعت ۹ تا ۱۲ قطع خواهد بود.',
  author_name: 'مدیر ساختمان',
  created_at: hoursAgo(3),
}

const older = {
  id: 2,
  title: 'جلسه هیئت مدیره',
  content: 'جلسه هیئت مدیره شنبه ساعت ۱۸ در لابی برگزار می‌شود.',
  author_name: 'مدیر ساختمان',
  created_at: daysAgo(5),
}

const ancient = {
  id: 1,
  title: 'قوانین پارکینگ',
  content: 'پارک خودرو در محل واحدهای دیگر ممنوع است.',
  author_name: 'مدیر ساختمان',
  created_at: daysAgo(30),
}

describe('AnnouncementFeed', () => {
  beforeEach(() => {
    residentAnnouncementApi.list.mockReset()
    residentAnnouncementApi.list.mockResolvedValue([fresh, older, ancient])
  })

  it('shows a loading state while the feed is being read', () => {
    residentAnnouncementApi.list.mockReturnValue(new Promise(() => {}))
    render(<AnnouncementFeed />)

    expect(screen.getByRole('status', { name: 'در حال بارگذاری اطلاعیه‌ها' })).toBeInTheDocument()
  })

  it('renders the title and content of every announcement', async () => {
    render(<AnnouncementFeed />)

    expect(await screen.findByText('قطع آب ساختمان')).toBeInTheDocument()
    expect(screen.getByText('آب ساختمان فردا از ساعت ۹ تا ۱۲ قطع خواهد بود.')).toBeInTheDocument()
    expect(screen.getByText('جلسه هیئت مدیره')).toBeInTheDocument()
    expect(screen.getByText('پارک خودرو در محل واحدهای دیگر ممنوع است.')).toBeInTheDocument()
    expect(screen.getAllByText('از طرف مدیر ساختمان')).toHaveLength(3)
  })

  it('keeps the newest announcement at the top of the feed', async () => {
    render(<AnnouncementFeed />)

    await screen.findByText('قطع آب ساختمان')
    const titles = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)
    expect(titles).toEqual(['قطع آب ساختمان', 'جلسه هیئت مدیره', 'قوانین پارکینگ'])
  })

  it('dates recent announcements relatively and older ones absolutely', async () => {
    render(<AnnouncementFeed />)

    await screen.findByText('قطع آب ساختمان')
    expect(screen.getByText('۳ ساعت پیش')).toBeInTheDocument()
    expect(screen.getByText('۵ روز پیش')).toBeInTheDocument()
    // Past a week, counting days stops helping, so the calendar date is shown.
    expect(screen.getByText(formatDate(ancient.created_at))).toBeInTheDocument()
  })

  it('flags only the announcements published in the last day as new', async () => {
    render(<AnnouncementFeed />)

    await screen.findByText('قطع آب ساختمان')
    const badges = screen.getAllByText('جدید')
    expect(badges).toHaveLength(1)
    // The badge belongs to the announcement published three hours ago.
    expect(within(badges[0].closest('article')).getByText('قطع آب ساختمان')).toBeInTheDocument()
  })

  it('shows an empty state when there are no announcements', async () => {
    residentAnnouncementApi.list.mockResolvedValue([])
    render(<AnnouncementFeed />)

    expect(await screen.findByText('در حال حاضر اطلاعیه‌ای وجود ندارد')).toBeInTheDocument()
    expect(
      screen.getByText('هر اطلاعیه جدیدی که مدیریت ساختمان منتشر کند، همین‌جا نمایش داده می‌شود.'),
    ).toBeInTheDocument()
  })

  it('offers a retry when the feed cannot be read', async () => {
    const user = userEvent.setup()
    residentAnnouncementApi.list
      .mockRejectedValueOnce(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
      .mockResolvedValueOnce([fresh])
    render(<AnnouncementFeed />)

    expect(await screen.findByRole('alert')).toHaveTextContent('دریافت اطلاعیه‌ها ناموفق بود')
    expect(screen.getByText('خطایی در ارتباط با سرور رخ داد.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تلاش مجدد' }))
    expect(await screen.findByText('قطع آب ساختمان')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('re-reads the feed when the refresh button is used', async () => {
    const user = userEvent.setup()
    const justPublished = { ...fresh, id: 9, title: 'نظافت پارکینگ', created_at: hoursAgo(0.1) }
    residentAnnouncementApi.list
      .mockResolvedValueOnce([older])
      .mockResolvedValueOnce([justPublished, older])
    render(<AnnouncementFeed />)

    await screen.findByText('جلسه هیئت مدیره')
    await user.click(screen.getByRole('button', { name: 'به‌روزرسانی اطلاعیه‌ها' }))

    expect(await screen.findByText('نظافت پارکینگ')).toBeInTheDocument()
    await waitFor(() => expect(residentAnnouncementApi.list).toHaveBeenCalledTimes(2))
  })
})
