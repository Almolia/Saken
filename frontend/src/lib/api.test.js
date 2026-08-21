import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi } from './api'

function jsonErrorResponse(data, status = 400) {
  return {
    ok: false,
    status,
    headers: { get: () => 'application/json' },
    json: vi.fn().mockResolvedValue(data),
  }
}

describe('request error formatting', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('recursively formats nested DRF errors and ignores null/object wrappers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonErrorResponse({
      profile: {
        phone: ['شماره موبایل معتبر نیست.'],
        identity: {
          national_id: ['کد ملی قبلاً ثبت شده است.'],
          optional_field: null,
        },
      },
      non_field_errors: ['اطلاعات ارسال‌شده معتبر نیست.'],
      metadata: { error_code: 42 },
    })))

    await expect(authApi.login({ login: 'invalid' })).rejects.toMatchObject({
      message: 'شماره موبایل معتبر نیست. کد ملی قبلاً ثبت شده است. اطلاعات ارسال‌شده معتبر نیست.',
      status: 400,
    })
  })

  it('keeps the raw payload so a form can place each error under its field', async () => {
    const payload = {
      title: ['عنوان نظرسنجی الزامی است.'],
      ends_at: ['زمان پایان باید در آینده باشد.'],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonErrorResponse(payload)))

    await expect(authApi.login({})).rejects.toMatchObject({ details: payload })
  })

  it('never stringifies a nested object as [object Object]', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonErrorResponse({
      detail: { nested: ['خطای قابل خواندن'] },
      ignored: null,
    })))

    try {
      await authApi.login({})
      throw new Error('Expected request to reject')
    } catch (error) {
      expect(error.message).toBe('خطای قابل خواندن')
      expect(error.message).not.toContain('[object Object]')
    }
  })
})
