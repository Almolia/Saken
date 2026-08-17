import { describe, expect, it } from 'vitest'
import { formatArea, formatCurrency, formatDate, formatRelativeDate, resolveHomePath } from './helpers'

describe('helpers', () => {
  describe('resolveHomePath', () => {
    it('resolves the dedicated dashboard path for service staff users', () => {
      expect(resolveHomePath({ role: 'service_staff' })).toBe('/service/dashboard')
    })

    it('returns the login route for unauthenticated and unknown roles', () => {
      expect(resolveHomePath(null)).toBe('/login')
      expect(resolveHomePath({ role: 'unknown' })).toBe('/login')
    })
  })

  describe('formatCurrency', () => {
    it('formats numbers with thousand separators and تومان suffix', () => {
      expect(formatCurrency(250000)).toBe('250,000 تومان')
      expect(formatCurrency('500000')).toBe('500,000 تومان')
    })
  })

  describe('formatDate', () => {
    it('formats date strings nicely or returns empty for empty input', () => {
      expect(formatDate('')).toBe('')
      expect(formatDate(null)).toBe('')
      expect(formatDate('2026-09-20')).toBeTruthy()
    })
  })

  describe('formatRelativeDate', () => {
    const now = new Date('2026-08-17T12:00:00Z').getTime()
    const ago = (seconds) => new Date(now - seconds * 1000).toISOString()

    it('returns empty for empty input and echoes an unparsable value', () => {
      expect(formatRelativeDate('', now)).toBe('')
      expect(formatRelativeDate(null, now)).toBe('')
      expect(formatRelativeDate('not-a-date', now)).toBe('not-a-date')
    })

    it('calls anything under a minute "just now"', () => {
      expect(formatRelativeDate(ago(5), now)).toBe('هم‌اکنون')
      expect(formatRelativeDate(ago(59), now)).toBe('هم‌اکنون')
    })

    it('counts minutes, hours and days while they stay readable', () => {
      expect(formatRelativeDate(ago(5 * 60), now)).toBe('۵ دقیقه پیش')
      expect(formatRelativeDate(ago(3 * 3600), now)).toBe('۳ ساعت پیش')
      expect(formatRelativeDate(ago(24 * 3600), now)).toBe('دیروز')
      expect(formatRelativeDate(ago(3 * 24 * 3600), now)).toBe('۳ روز پیش')
    })

    it('falls back to the absolute date once a week has passed', () => {
      const old = ago(30 * 24 * 3600)
      expect(formatRelativeDate(old, now)).toBe(formatDate(old))
    })

    it('treats a future timestamp from clock skew as "just now"', () => {
      expect(formatRelativeDate(ago(-30), now)).toBe('هم‌اکنون')
    })
  })

  describe('formatArea', () => {
    it('formats area with meter suffix', () => {
      expect(formatArea(85)).toBe('85 متر مربع')
    })
  })
})
