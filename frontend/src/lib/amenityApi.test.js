import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './api'
import { managerAmenityApi } from './amenityApi'

vi.mock('./api', () => ({
  request: vi.fn(),
}))

const calledPath = () => request.mock.calls.at(-1)[0]

describe('managerAmenityApi.reservations', () => {
  beforeEach(() => {
    request.mockReset()
    request.mockResolvedValue({ reservations: [] })
  })

  it('asks for the whole log when given nothing', () => {
    managerAmenityApi.reservations()
    expect(calledPath()).toBe('/manager/reservations/')
  })

  it('sends the global search term to the endpoint', () => {
    managerAmenityApi.reservations({ search: 'استخر' })

    const query = new URLSearchParams(calledPath().split('?')[1])
    expect(query.get('search')).toBe('استخر')
  })

  it('keeps the amenity and date filters alongside the search', () => {
    managerAmenityApi.reservations({ search: 'Canceled', amenity: 3, date: '2026-08-19' })

    const query = new URLSearchParams(calledPath().split('?')[1])
    expect(query.get('search')).toBe('Canceled')
    expect(query.get('amenity')).toBe('3')
    expect(query.get('date')).toBe('2026-08-19')
  })

  it('drops blank filters instead of sending empty parameters', () => {
    managerAmenityApi.reservations({ search: '   ', amenity: '', date: null })
    expect(calledPath()).toBe('/manager/reservations/')
  })

  it('encodes a term that would otherwise break the query string', () => {
    managerAmenityApi.reservations({ search: 'سالن & استخر' })

    const query = new URLSearchParams(calledPath().split('?')[1])
    expect(query.get('search')).toBe('سالن & استخر')
  })
})
