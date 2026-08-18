import { describe, expect, it } from 'vitest'
import { isoToJalali, jalaliToIso } from './jalaliDate'

describe('Jalali date conversion', () => {
  it('converts Nowruz in both directions', () => {
    expect(jalaliToIso('۱۴۰۵/۰۱/۰۱')).toBe('2026-03-21')
    expect(isoToJalali('2026-03-21')).toEqual({ jy: 1405, jm: 1, jd: 1 })
  })

  it('rejects an impossible Jalali date', () => {
    expect(jalaliToIso('1405/12/31')).toBeNull()
  })
})
