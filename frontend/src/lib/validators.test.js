import { describe, expect, it } from 'vitest'
import { mapPollServerErrors } from './validators'

function rejection(details, message = 'خطایی رخ داد.') {
  return Object.assign(new Error(message), { details, status: 400 })
}

describe('mapPollServerErrors', () => {
  it('puts a serializer complaint under the form field it belongs to', () => {
    const { fieldErrors } = mapPollServerErrors(
      rejection({
        title: ['عنوان نظرسنجی الزامی است.'],
        ends_at: ['زمان پایان باید در آینده باشد.'],
      }),
    )

    expect(fieldErrors).toEqual({
      title: 'عنوان نظرسنجی الزامی است.',
      endDate: 'زمان پایان باید در آینده باشد.',
    })
  })

  it('translates the server field names the form does not share', () => {
    const { fieldErrors } = mapPollServerErrors(
      rejection({
        options: ['حداقل دو گزینه برای نظرسنجی الزامی است.'],
        target_units: ['واحد انتخاب‌شده معتبر نیست.'],
      }),
    )

    expect(fieldErrors.options).toBe('حداقل دو گزینه برای نظرسنجی الزامی است.')
    expect(fieldErrors.targetUnitIds).toBe('واحد انتخاب‌شده معتبر نیست.')
  })

  it('flattens a nested option error into the one options message', () => {
    // A rejected item in the options list answers positionally, with an empty
    // object standing in for each option the server was happy with.
    const { fieldErrors } = mapPollServerErrors(
      rejection({ options: [{}, { text: ['این فیلد نمی‌تواند خالی باشد.'] }] }),
    )

    expect(fieldErrors.options).toBe('این فیلد نمی‌تواند خالی باشد.')
  })

  it('joins several complaints about one field into a single message', () => {
    const { fieldErrors } = mapPollServerErrors(
      rejection({ title: ['عنوان الزامی است.', 'عنوان بسیار طولانی است.'] }),
    )

    expect(fieldErrors.title).toBe('عنوان الزامی است. عنوان بسیار طولانی است.')
  })

  it("keeps the view's own refusal as a general message", () => {
    const { fieldErrors, message } = mapPollServerErrors(
      rejection({ detail: 'فقط نظرسنجی‌های در وضعیت پیش‌نویس قابل ویرایش هستند.' }),
    )

    expect(fieldErrors).toEqual({})
    expect(message).toBe('فقط نظرسنجی‌های در وضعیت پیش‌نویس قابل ویرایش هستند.')
  })

  it('keeps an unrecognised field visible rather than dropping it', () => {
    const { fieldErrors, message } = mapPollServerErrors(
      rejection({ starts_at: ['برای انتشار، زمان شروع الزامی است.'] }),
    )

    expect(fieldErrors).toEqual({})
    expect(message).toBe('برای انتشار، زمان شروع الزامی است.')
  })

  it('tells the manager to look at the fields when every error was placed', () => {
    const { message } = mapPollServerErrors(rejection({ title: ['عنوان نظرسنجی الزامی است.'] }))

    expect(message).toBe('برخی از فیلدهای فرم نیاز به اصلاح دارند.')
  })

  it('falls back to the flattened message when there is no payload to read', () => {
    expect(mapPollServerErrors(new Error('ارتباط با سرور برقرار نشد.'))).toEqual({
      fieldErrors: {},
      message: 'ارتباط با سرور برقرار نشد.',
    })
  })

  it('survives a payload that is not an object', () => {
    expect(mapPollServerErrors(rejection(['خطا'], 'خطا')).message).toBe('خطا')
    expect(mapPollServerErrors(undefined).message).toBe('ثبت نظرسنجی ناموفق بود.')
  })
})
