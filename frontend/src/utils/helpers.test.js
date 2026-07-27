import { describe, expect, it } from 'vitest'
import { resolveHomePath } from './helpers'

describe('resolveHomePath', () => {
  it('resolves the dedicated dashboard path for service staff users', () => {
    expect(resolveHomePath({ role: 'service_staff' })).toBe('/service/dashboard')
  })

  it('returns the login route for unauthenticated and unknown roles', () => {
    expect(resolveHomePath(null)).toBe('/login')
    expect(resolveHomePath({ role: 'unknown' })).toBe('/login')
  })
})
