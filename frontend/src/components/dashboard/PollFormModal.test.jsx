import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { PollFormModal } from './PollFormModal'
import { splitLocalDateTime } from '../../utils/polls'

const units = [
  { id: 7, unit_number: '101', floor: 1, owner: { id: 3, full_name: 'سارا احمدی' } },
  { id: 8, unit_number: '102', floor: 1, owner: null },
]

const titleField = () => screen.getByLabelText(/پرسش نظرسنجی/)
const descriptionField = () => screen.getByLabelText(/توضیحات/)
const optionField = (index) => screen.getByLabelText(`گزینه ${index}`)
const endDateField = () => screen.getByLabelText('تاریخ پایان')
const saveDraftButton = () => screen.getByRole('button', { name: /ذخیره پیش‌نویس/ })
// PrimaryButton replaces its label with a spinner while loading, leaving the
// button with no accessible name, so mid-request it is found by its type.
const submitButton = () =>
  within(screen.getByRole('dialog'))
    .getAllByRole('button')
    .find((button) => button.type === 'submit')

// The form refuses a deadline in the past, so the tests pin "now" and type a
// day well after it rather than depending on the wall clock.
const NOW = new Date('2026-08-20T09:00:00Z')
// The Jalali input commits as soon as the typed text parses, so a day written
// with its leading zero is what survives being typed one character at a time.
const FUTURE_JALALI = '1405/06/05'
const FUTURE_ISO_DAY = '2026-08-27'

function renderModal(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined)
  const onClose = props.onClose ?? vi.fn()
  render(
    <ToastProvider>
      <PollFormModal open units={units} onSubmit={onSubmit} onClose={onClose} {...props} />
    </ToastProvider>,
  )
  return { onSubmit, onClose }
}

// A rejection shaped the way DRF answers a serializer failure.
function serverRejection(details, message = 'درخواست نامعتبر است.') {
  return Object.assign(new Error(message), { details, status: 400 })
}

async function fillMinimumPoll(user) {
  await user.type(titleField(), 'رنگ نمای جدید ساختمان کدام باشد؟')
  await user.type(optionField(1), 'کرم')
  await user.type(optionField(2), 'خاکستری')
  await user.type(endDateField(), FUTURE_JALALI)
  await user.tab()
}

describe('PollFormModal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing while closed', () => {
    render(
      <ToastProvider>
        <PollFormModal open={false} onSubmit={vi.fn()} onClose={vi.fn()} />
      </ToastProvider>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens empty with two option rows and the whole building targeted', () => {
    renderModal()

    expect(screen.getByRole('heading', { name: 'ایجاد نظرسنجی جدید' })).toBeInTheDocument()
    expect(titleField()).toHaveValue('')
    expect(optionField(1)).toHaveValue('')
    expect(optionField(2)).toHaveValue('')
    expect(screen.queryByLabelText('گزینه 3')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /همه واحدها/ })).toBeChecked()
    // A new poll is a draft unless the manager asks for it to go out now.
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('refuses to submit an empty form', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.click(saveDraftButton())

    expect(screen.getByText('عنوان نظرسنجی الزامی است.')).toBeInTheDocument()
    expect(screen.getByText('حداقل دو گزینه برای نظرسنجی الزامی است.')).toBeInTheDocument()
    expect(screen.getByText('تاریخ پایان نظرسنجی الزامی است.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('refuses a single answered option', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(titleField(), 'آیا با بازسازی لابی موافقید؟')
    await user.type(optionField(1), 'بله')
    await user.type(endDateField(), FUTURE_JALALI)
    await user.click(saveDraftButton())

    expect(screen.getByText('حداقل دو گزینه برای نظرسنجی الزامی است.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('refuses two options with the same text', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(titleField(), 'آیا با بازسازی لابی موافقید؟')
    await user.type(optionField(1), 'بله')
    await user.type(optionField(2), 'بله')
    await user.type(endDateField(), FUTURE_JALALI)
    await user.click(saveDraftButton())

    expect(
      screen.getByText('گزینه‌های تکراری مجاز نیستند؛ هر گزینه باید متن یکتا داشته باشد.'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('refuses a deadline that has already passed', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(titleField(), 'آیا با بازسازی لابی موافقید؟')
    await user.type(optionField(1), 'بله')
    await user.type(optionField(2), 'خیر')
    await user.type(endDateField(), '1404/01/01')
    await user.click(saveDraftButton())

    expect(screen.getByText('زمان پایان باید در آینده باشد.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('saves a draft with its options in the order they are listed', async () => {
    const user = userEvent.setup()
    const { onSubmit, onClose } = renderModal()

    await fillMinimumPoll(user)
    await user.click(saveDraftButton())

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const payload = onSubmit.mock.calls[0][0]
    expect(payload).toMatchObject({
      title: 'رنگ نمای جدید ساختمان کدام باشد؟',
      description: '',
      status: 'Draft',
      target_units: [],
      options: [
        { text: 'کرم', position: 0 },
        { text: 'خاکستری', position: 1 },
      ],
    })
    // A draft is not published, so it carries no start.
    expect(payload.starts_at).toBeUndefined()
    expect(splitLocalDateTime(payload.ends_at).date).toBe(FUTURE_ISO_DAY)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('publishes immediately when the manager asks for it', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await fillMinimumPoll(user)
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: /ایجاد و انتشار نظرسنجی/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.status).toBe('Active')
    // The server refuses to publish without a start; the poll starts now.
    expect(payload.starts_at).toBeTruthy()
  })

  it('adds, reorders and removes option rows', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(titleField(), 'کدام روز برای جلسه ساختمان مناسب است؟')
    await user.type(optionField(1), 'شنبه')
    await user.type(optionField(2), 'یکشنبه')
    await user.click(screen.getByRole('button', { name: 'افزودن گزینه' }))
    await user.type(optionField(3), 'دوشنبه')

    // Move the third answer to the top; the order is what residents will see.
    await user.click(screen.getByRole('button', { name: 'انتقال گزینه 3 به بالا' }))
    expect(optionField(2)).toHaveValue('دوشنبه')

    await user.click(screen.getByRole('button', { name: 'حذف گزینه 3' }))
    expect(screen.queryByLabelText('گزینه 3')).not.toBeInTheDocument()

    await user.type(endDateField(), FUTURE_JALALI)
    await user.click(saveDraftButton())

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].options).toEqual([
      { text: 'شنبه', position: 0 },
      { text: 'دوشنبه', position: 1 },
    ])
  })

  it('keeps the last two option rows undeletable', () => {
    renderModal()

    expect(screen.getByRole('button', { name: 'حذف گزینه 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'حذف گزینه 2' })).toBeDisabled()
  })

  it('requires at least one unit once the poll is restricted', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await fillMinimumPoll(user)
    await user.click(screen.getByRole('radio', { name: /واحدهای منتخب/ }))
    await user.click(saveDraftButton())

    expect(
      screen.getByText('حداقل یک واحد را انتخاب کنید یا نظرسنجی را برای همه واحدها منتشر کنید.'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('sends the chosen unit ids for a restricted poll', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await fillMinimumPoll(user)
    await user.click(screen.getByRole('radio', { name: /واحدهای منتخب/ }))
    await user.click(screen.getByRole('checkbox', { name: /واحد 101/ }))
    await user.click(saveDraftButton())

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].target_units).toEqual([7])
  })

  it('shows which units have no resident to answer', () => {
    renderModal()

    const restricted = screen.getByRole('radio', { name: /واحدهای منتخب/ })
    restricted.click()

    expect(screen.getByText('بدون ساکن')).toBeInTheDocument()
  })

  it('opens an existing draft with its saved answers', () => {
    renderModal({
      poll: {
        id: 4,
        title: 'ساعت تخلیه زباله',
        description: 'برای هماهنگی با شهرداری',
        status: 'Draft',
        ends_at: '2026-09-06T20:30:00Z',
        target_units: [8],
        options: [
          { id: 2, text: 'ساعت ۲۰', position: 1 },
          { id: 1, text: 'ساعت ۸', position: 0 },
        ],
      },
    })

    expect(screen.getByRole('heading', { name: 'ویرایش نظرسنجی' })).toBeInTheDocument()
    expect(titleField()).toHaveValue('ساعت تخلیه زباله')
    expect(descriptionField()).toHaveValue('برای هماهنگی با شهرداری')
    // Stored positions decide the order, not the order the API listed them in.
    expect(optionField(1)).toHaveValue('ساعت ۸')
    expect(optionField(2)).toHaveValue('ساعت ۲۰')
    expect(screen.getByRole('radio', { name: /واحدهای منتخب/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /واحد 102/ })).toBeChecked()
    // Publishing an existing draft happens from the master list, not here.
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('sends an edit without a status so the draft stays a draft', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal({
      poll: {
        id: 4,
        title: 'ساعت تخلیه زباله',
        description: '',
        status: 'Draft',
        ends_at: '2026-09-06T20:30:00Z',
        target_units: [],
        options: [
          { id: 1, text: 'ساعت ۸', position: 0 },
          { id: 2, text: 'ساعت ۲۰', position: 1 },
        ],
      },
    })

    await user.type(titleField(), ' (اصلاح‌شده)')
    await user.click(screen.getByRole('button', { name: /ذخیره تغییرات/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.title).toBe('ساعت تخلیه زباله (اصلاح‌شده)')
    expect(payload).not.toHaveProperty('status')
    expect(payload).not.toHaveProperty('starts_at')
  })

  it('keeps the typed poll on screen when the server rejects it', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('عنوان نظرسنجی الزامی است.'))
    const { onClose } = renderModal({ onSubmit })

    await fillMinimumPoll(user)
    await user.click(saveDraftButton())

    // The reason lands in the dialog's banner and in a toast; the typed poll
    // stays exactly as it was.
    await waitFor(() => expect(screen.getAllByText('عنوان نظرسنجی الزامی است.')).toHaveLength(2))
    expect(titleField()).toHaveValue('رنگ نمای جدید ساختمان کدام باشد؟')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('puts a serializer error back under the field it is about', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(
      serverRejection({
        title: ['نظرسنجی دیگری با این عنوان وجود دارد.'],
        ends_at: ['زمان پایان باید در آینده باشد.'],
      }),
    )
    const { onClose } = renderModal({ onSubmit })

    await fillMinimumPoll(user)
    await user.click(saveDraftButton())

    expect(
      await screen.findByText('نظرسنجی دیگری با این عنوان وجود دارد.'),
    ).toBeInTheDocument()
    expect(screen.getByText('زمان پایان باید در آینده باشد.')).toBeInTheDocument()
    // The banner does not repeat what is already shown under each field.
    expect(screen.getAllByText('برخی از فیلدهای فرم نیاز به اصلاح دارند.').length).toBeGreaterThan(0)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('announces a rejected submit in a toast as well as inline', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(
      serverRejection({ detail: 'فقط نظرسنجی‌های در وضعیت پیش‌نویس قابل ویرایش هستند.' }),
    )
    renderModal({ onSubmit })

    await fillMinimumPoll(user)
    await user.click(saveDraftButton())

    // Once in the dialog's own banner, once in the toast — the toast is what
    // gets noticed when the offending field has scrolled out of view.
    await waitFor(() =>
      expect(
        screen.getAllByText('فقط نظرسنجی‌های در وضعیت پیش‌نویس قابل ویرایش هستند.'),
      ).toHaveLength(2),
    )
  })

  it('clears a server error on the field as soon as it is edited', async () => {
    const user = userEvent.setup()
    const onSubmit = vi
      .fn()
      .mockRejectedValue(serverRejection({ title: ['نظرسنجی دیگری با این عنوان وجود دارد.'] }))
    renderModal({ onSubmit })

    await fillMinimumPoll(user)
    await user.click(saveDraftButton())
    expect(await screen.findByText('نظرسنجی دیگری با این عنوان وجود دارد.')).toBeInTheDocument()

    await user.type(titleField(), ' جدید')

    expect(screen.queryByText('نظرسنجی دیگری با این عنوان وجود دارد.')).not.toBeInTheDocument()
  })

  it('falls back to the flattened message when the rejection has no payload', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('ارتباط با سرور برقرار نشد.'))
    renderModal({ onSubmit })

    await fillMinimumPoll(user)
    await user.click(saveDraftButton())

    await waitFor(() =>
      expect(screen.getAllByText('ارتباط با سرور برقرار نشد.').length).toBeGreaterThan(0),
    )
  })

  it('locks every input while the request is in flight', async () => {
    const user = userEvent.setup()
    // Never settles, so the form stays mid-request for the whole assertion.
    const onSubmit = vi.fn(() => new Promise(() => {}))
    renderModal({ onSubmit })

    await fillMinimumPoll(user)
    await user.click(saveDraftButton())

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(submitButton()).toBeDisabled()
    expect(titleField()).toBeDisabled()
    expect(descriptionField()).toBeDisabled()
    expect(optionField(1)).toBeDisabled()
    expect(screen.getByLabelText('ساعت پایان')).toBeDisabled()
    expect(screen.getByRole('radio', { name: /واحدهای منتخب/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'افزودن گزینه' })).toBeDisabled()
  })

  it('does not resubmit when the button is clicked again mid-request', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(() => new Promise(() => {}))
    renderModal({ onSubmit })

    await fillMinimumPoll(user)
    await user.click(saveDraftButton())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    await user.click(submitButton())

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('reports a unit directory that could not be loaded', async () => {
    const user = userEvent.setup()
    renderModal({ unitsError: 'خطایی در دریافت فهرست واحدها رخ داد.', units: [] })

    await user.click(screen.getByRole('radio', { name: /واحدهای منتخب/ }))

    const picker = screen.getByText('خطایی در دریافت فهرست واحدها رخ داد.')
    expect(picker).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
