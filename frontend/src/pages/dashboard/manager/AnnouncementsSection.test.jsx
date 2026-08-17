import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/ToastProvider'
import { managerApi } from '../../../lib/api'
import { AnnouncementsSection } from './AnnouncementsSection'

vi.mock('../../../lib/api', () => ({
  managerApi: {
    announcements: vi.fn(),
    createAnnouncement: vi.fn(),
    updateAnnouncement: vi.fn(),
    deleteAnnouncement: vi.fn(),
  },
}))

const published = {
  id: 2,
  title: 'قطع آب ساختمان',
  content: 'آب ساختمان فردا از ساعت ۹ تا ۱۲ قطع خواهد بود.',
  author_name: 'مدیر ساختمان',
  is_active: true,
  created_at: '2026-08-16T09:00:00Z',
  updated_at: '2026-08-16T09:00:00Z',
}

const archived = {
  id: 1,
  title: 'جلسه هیئت مدیره',
  content: 'جلسه هیئت مدیره پنج‌شنبه ساعت ۱۸ برگزار می‌شود.',
  author_name: 'مدیر ساختمان',
  is_active: false,
  created_at: '2026-08-10T09:00:00Z',
  updated_at: '2026-08-10T09:00:00Z',
}

function renderSection() {
  return render(
    <ToastProvider>
      <AnnouncementsSection />
    </ToastProvider>,
  )
}

const publishAction = () => screen.getByRole('button', { name: 'انتشار اطلاعیه جدید' })
const titleField = () => screen.getByLabelText(/عنوان اطلاعیه/)
const contentField = () => screen.getByLabelText('متن اطلاعیه')

async function openPublishForm(user) {
  await user.click(publishAction())
  return screen.getByRole('heading', { name: 'انتشار اطلاعیه جدید' })
}

describe('AnnouncementsSection', () => {
  beforeEach(() => {
    managerApi.announcements.mockReset()
    managerApi.createAnnouncement.mockReset()
    managerApi.updateAnnouncement.mockReset()
    managerApi.deleteAnnouncement.mockReset()
    managerApi.announcements.mockResolvedValue({ announcements: [published, archived] })
  })

  it('loads the announcement list and counts published against archived', async () => {
    renderSection()

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument()

    expect(await screen.findByText('قطع آب ساختمان')).toBeInTheDocument()
    expect(screen.getByText('جلسه هیئت مدیره')).toBeInTheDocument()
    expect(screen.getByText('2 اطلاعیه ثبت شده است.')).toBeInTheDocument()
    // One card sits in front of residents, the other is archived.
    expect(screen.getByText('در دید ساکنان')).toBeInTheDocument()
    expect(screen.getByText('پنهان از ساکنان')).toBeInTheDocument()
  })

  it('invites the manager to publish the first announcement when there are none', async () => {
    managerApi.announcements.mockResolvedValue({ announcements: [] })
    renderSection()

    expect(await screen.findByText('هنوز اطلاعیه‌ای منتشر نشده است')).toBeInTheDocument()
    expect(publishAction()).toBeInTheDocument()
  })

  it('publishes a new announcement and prepends it without refetching', async () => {
    const user = userEvent.setup()
    const created = {
      id: 3,
      title: 'نظافت پارکینگ',
      content: 'پارکینگ روز شنبه نظافت می‌شود؛ خودروها را جابه‌جا کنید.',
      author_name: 'مدیر ساختمان',
      is_active: true,
      created_at: '2026-08-17T09:00:00Z',
      updated_at: '2026-08-17T09:00:00Z',
    }
    managerApi.createAnnouncement.mockResolvedValue({
      message: 'اطلاعیه با موفقیت ایجاد شد.',
      announcement: created,
    })
    renderSection()

    await screen.findByText('قطع آب ساختمان')
    await openPublishForm(user)

    await user.type(titleField(), 'نظافت پارکینگ')
    await user.type(contentField(), 'پارکینگ روز شنبه نظافت می‌شود؛ خودروها را جابه‌جا کنید.')
    await user.click(screen.getByRole('button', { name: 'انتشار اطلاعیه' }))

    await waitFor(() =>
      expect(managerApi.createAnnouncement).toHaveBeenCalledWith({
        title: 'نظافت پارکینگ',
        content: 'پارکینگ روز شنبه نظافت می‌شود؛ خودروها را جابه‌جا کنید.',
        is_active: true,
      }),
    )

    // Success toast, closed form, and the new record at the top of the list.
    expect(await screen.findByText('اطلاعیه با موفقیت ایجاد شد.')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'انتشار اطلاعیه جدید' })).not.toBeInTheDocument(),
    )
    const titles = within(screen.getByRole('list'))
      .getAllByRole('heading', { level: 3 })
      .map((node) => node.textContent)
    expect(titles).toEqual(['نظافت پارکینگ', 'قطع آب ساختمان', 'جلسه هیئت مدیره'])
    expect(managerApi.announcements).toHaveBeenCalledTimes(1)
  })

  it('keeps the form open with the server message when publishing fails', async () => {
    const user = userEvent.setup()
    managerApi.createAnnouncement.mockRejectedValue(
      Object.assign(new Error('عنوان اطلاعیه تکراری است.'), { status: 400 }),
    )
    renderSection()

    await screen.findByText('قطع آب ساختمان')
    await openPublishForm(user)

    await user.type(titleField(), 'قطع آب ساختمان')
    await user.type(contentField(), 'آب ساختمان فردا قطع خواهد بود.')
    await user.click(screen.getByRole('button', { name: 'انتشار اطلاعیه' }))

    expect(await screen.findByText('عنوان اطلاعیه تکراری است.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'انتشار اطلاعیه جدید' })).toBeInTheDocument()
  })

  it('starts the publish form empty again after a successful publish', async () => {
    const user = userEvent.setup()
    managerApi.createAnnouncement.mockResolvedValue({
      message: 'اطلاعیه با موفقیت ایجاد شد.',
      announcement: { ...published, id: 4, title: 'نظافت پارکینگ' },
    })
    renderSection()

    await screen.findByText('قطع آب ساختمان')
    await openPublishForm(user)
    await user.type(titleField(), 'نظافت پارکینگ')
    await user.type(contentField(), 'پارکینگ روز شنبه نظافت می‌شود.')
    await user.click(screen.getByRole('button', { name: 'انتشار اطلاعیه' }))

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'انتشار اطلاعیه جدید' })).not.toBeInTheDocument(),
    )

    await openPublishForm(user)
    expect(titleField()).toHaveValue('')
    expect(contentField()).toHaveValue('')
  })

  it('edits an announcement in place through the PATCH endpoint', async () => {
    const user = userEvent.setup()
    managerApi.updateAnnouncement.mockResolvedValue({
      message: 'اطلاعیه با موفقیت به‌روزرسانی شد.',
      announcement: { ...published, title: 'قطع آب ساختمان (لغو شد)' },
    })
    renderSection()

    await screen.findByText('قطع آب ساختمان')
    await user.click(screen.getAllByRole('button', { name: /ویرایش/ })[0])

    expect(titleField()).toHaveValue('قطع آب ساختمان')
    await user.clear(titleField())
    await user.type(titleField(), 'قطع آب ساختمان (لغو شد)')
    await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }))

    await waitFor(() =>
      expect(managerApi.updateAnnouncement).toHaveBeenCalledWith(2, {
        title: 'قطع آب ساختمان (لغو شد)',
        content: published.content,
        is_active: true,
      }),
    )
    expect(await screen.findByText('اطلاعیه با موفقیت به‌روزرسانی شد.')).toBeInTheDocument()
    expect(screen.getByText('قطع آب ساختمان (لغو شد)')).toBeInTheDocument()
  })

  it('archives a published announcement so residents stop seeing it', async () => {
    const user = userEvent.setup()
    managerApi.updateAnnouncement.mockResolvedValue({
      message: 'اطلاعیه با موفقیت به‌روزرسانی شد.',
      announcement: { ...published, is_active: false },
    })
    renderSection()

    await screen.findByText('قطع آب ساختمان')
    await user.click(screen.getByRole('button', { name: /بایگانی$/ }))

    await waitFor(() =>
      expect(managerApi.updateAnnouncement).toHaveBeenCalledWith(2, { is_active: false }),
    )
    expect(
      await screen.findByText('اطلاعیه بایگانی شد و دیگر به ساکنان نمایش داده نمی‌شود.'),
    ).toBeInTheDocument()
    // Both records are archived now, so the re-publish action shows up twice.
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /انتشار مجدد/ })).toHaveLength(2),
    )
  })

  it('re-publishes an archived announcement', async () => {
    const user = userEvent.setup()
    managerApi.updateAnnouncement.mockResolvedValue({
      message: 'اطلاعیه با موفقیت به‌روزرسانی شد.',
      announcement: { ...archived, is_active: true },
    })
    renderSection()

    await screen.findByText('جلسه هیئت مدیره')
    await user.click(screen.getByRole('button', { name: /انتشار مجدد/ }))

    await waitFor(() =>
      expect(managerApi.updateAnnouncement).toHaveBeenCalledWith(1, { is_active: true }),
    )
    expect(await screen.findByText('اطلاعیه دوباره برای ساکنان منتشر شد.')).toBeInTheDocument()
  })

  it('reports a failed visibility change without changing the row', async () => {
    const user = userEvent.setup()
    managerApi.updateAnnouncement.mockRejectedValue(
      Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }),
    )
    renderSection()

    await screen.findByText('قطع آب ساختمان')
    await user.click(screen.getByRole('button', { name: /بایگانی$/ }))

    expect(await screen.findByText('خطایی در ارتباط با سرور رخ داد.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /بایگانی$/ })).toBeInTheDocument()
  })

  it('asks for confirmation before deleting, then drops the row', async () => {
    const user = userEvent.setup()
    managerApi.deleteAnnouncement.mockResolvedValue({ message: 'اطلاعیه با موفقیت حذف شد.' })
    renderSection()

    await screen.findByText('قطع آب ساختمان')
    await user.click(screen.getAllByRole('button', { name: /حذف/ })[0])

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('قطع آب ساختمان')).toBeInTheDocument()
    expect(managerApi.deleteAnnouncement).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'بله، اطلاعیه حذف شود' }))

    await waitFor(() => expect(managerApi.deleteAnnouncement).toHaveBeenCalledWith(2))
    expect(await screen.findByText('اطلاعیه با موفقیت حذف شد.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('قطع آب ساختمان')).not.toBeInTheDocument())
    expect(screen.getByText('جلسه هیئت مدیره')).toBeInTheDocument()
  })

  it('keeps the row when the delete is cancelled', async () => {
    const user = userEvent.setup()
    renderSection()

    await screen.findByText('قطع آب ساختمان')
    await user.click(screen.getAllByRole('button', { name: /حذف/ })[0])
    await user.click(screen.getByRole('button', { name: 'انصراف' }))

    expect(managerApi.deleteAnnouncement).not.toHaveBeenCalled()
    expect(screen.getByText('قطع آب ساختمان')).toBeInTheDocument()
  })

  it('offers a retry when the list cannot be read', async () => {
    const user = userEvent.setup()
    managerApi.announcements
      .mockRejectedValueOnce(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
      .mockResolvedValueOnce({ announcements: [published] })
    renderSection()

    expect(await screen.findByText('خطایی در ارتباط با سرور رخ داد.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تلاش مجدد' }))
    expect(await screen.findByText('قطع آب ساختمان')).toBeInTheDocument()
  })
})
