import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnnouncementFormModal } from './AnnouncementFormModal'

const titleField = () => screen.getByLabelText(/عنوان اطلاعیه/)
const contentField = () => screen.getByLabelText('متن اطلاعیه')
const publishButton = () => screen.getByRole('button', { name: 'انتشار اطلاعیه' })

function renderModal(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined)
  const onClose = props.onClose ?? vi.fn()
  render(<AnnouncementFormModal open onSubmit={onSubmit} onClose={onClose} {...props} />)
  return { onSubmit, onClose }
}

describe('AnnouncementFormModal', () => {
  it('opens empty in publish mode', () => {
    renderModal()

    expect(screen.getByRole('heading', { name: 'انتشار اطلاعیه جدید' })).toBeInTheDocument()
    expect(titleField()).toHaveValue('')
    expect(contentField()).toHaveValue('')
    // New announcements are visible to residents unless the manager says otherwise.
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('refuses to submit while the required fields are empty', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.click(publishButton())

    expect(screen.getByText('عنوان اطلاعیه الزامی است.')).toBeInTheDocument()
    expect(screen.getByText('متن اطلاعیه الزامی است.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('enforces the minimum lengths on both fields', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(titleField(), 'آب')
    await user.type(contentField(), 'کوتاه')
    await user.click(publishButton())

    expect(screen.getByText('عنوان اطلاعیه باید حداقل ۳ کاراکتر باشد.')).toBeInTheDocument()
    expect(screen.getByText('متن اطلاعیه باید حداقل ۱۰ کاراکتر باشد.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a title longer than the backend column allows', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(titleField(), 'a'.repeat(256))
    await user.type(contentField(), 'متن کامل اطلاعیه ساختمان')
    await user.click(publishButton())

    expect(
      screen.getByText('عنوان اطلاعیه نمی‌تواند بیشتر از 255 کاراکتر باشد.'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('counts the characters typed into the body', async () => {
    const user = userEvent.setup()
    renderModal()

    expect(screen.getByText('0 از 4000')).toBeInTheDocument()
    await user.type(contentField(), 'قطع آب')
    expect(screen.getByText('6 از 4000')).toBeInTheDocument()
  })

  it('submits the trimmed values, then closes the form', async () => {
    const user = userEvent.setup()
    const { onSubmit, onClose } = renderModal()

    await user.type(titleField(), '  قطع آب ساختمان  ')
    await user.type(contentField(), '  آب فردا از ۹ تا ۱۲ قطع است.  ')
    await user.click(publishButton())

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'قطع آب ساختمان',
        content: 'آب فردا از ۹ تا ۱۲ قطع است.',
        is_active: true,
      }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('publishes as archived when the visibility toggle is turned off', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(titleField(), 'پیش‌نویس اطلاعیه')
    await user.type(contentField(), 'این متن هنوز نهایی نشده است.')
    await user.click(screen.getByRole('switch'))
    await user.click(publishButton())

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ is_active: false })),
    )
  })

  it('blocks a duplicate submission while the request is in flight', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(() => new Promise(() => {}))
    renderModal({ onSubmit })

    await user.type(titleField(), 'قطع آب ساختمان')
    await user.type(contentField(), 'آب فردا از ۹ تا ۱۲ قطع است.')

    const submit = publishButton()
    await user.click(submit)
    await waitFor(() => expect(submit).toBeDisabled())
    await user.click(submit)

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('keeps the form open and shows the server message when the save fails', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('انتشار اطلاعیه ناموفق بود.'))
    const { onClose } = renderModal({ onSubmit })

    await user.type(titleField(), 'قطع آب ساختمان')
    await user.type(contentField(), 'آب فردا از ۹ تا ۱۲ قطع است.')
    await user.click(publishButton())

    expect(await screen.findByText('انتشار اطلاعیه ناموفق بود.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    // The typed values survive so the manager can retry without re-typing.
    expect(titleField()).toHaveValue('قطع آب ساختمان')
  })

  it('prefills the fields when editing an existing announcement', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal({
      announcement: {
        id: 7,
        title: 'جلسه ساختمان',
        content: 'جلسه هیئت مدیره پنج‌شنبه برگزار می‌شود.',
        is_active: false,
      },
    })

    expect(screen.getByRole('heading', { name: 'ویرایش اطلاعیه' })).toBeInTheDocument()
    expect(titleField()).toHaveValue('جلسه ساختمان')
    expect(contentField()).toHaveValue('جلسه هیئت مدیره پنج‌شنبه برگزار می‌شود.')
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

    await user.clear(titleField())
    await user.type(titleField(), 'جلسه ساختمان (لغو شد)')
    await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'جلسه ساختمان (لغو شد)', is_active: false }),
      ),
    )
  })
})
