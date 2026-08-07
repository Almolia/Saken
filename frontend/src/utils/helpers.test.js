import { describe, expect, it } from 'vitest'
import { formatArea, formatCurrency, formatDate, resolveHomePath } from './helpers'

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

  describe('formatArea', () => {
    it('formats area with meter suffix', () => {
      expect(formatArea(85)).toBe('85 متر مربع')
    })
  })
})
