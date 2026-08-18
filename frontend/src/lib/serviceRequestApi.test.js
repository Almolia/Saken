import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './api'
import { managerServiceRequestApi } from './serviceRequestApi'

vi.mock('./api', () => ({
  request: vi.fn(),
}))

const calledPath = () => request.mock.calls.at(-1)[0]

describe('managerServiceRequestApi.listAll', () => {
  beforeEach(() => {
    request.mockReset()
    request.mockResolvedValue({ requests: [] })
  })

  it('asks for the unfiltered list when given nothing', () => {
    managerServiceRequestApi.listAll()
    expect(calledPath()).toBe('/manager/requests/')
  })

  it('sends the status as a query parameter', () => {
    managerServiceRequestApi.listAll({ status: 'Pending' })
    expect(calledPath()).toBe('/manager/requests/?status=Pending')
  })

  it('sends the ordering as a query parameter', () => {
    managerServiceRequestApi.listAll({ ordering: '-created_at' })
    expect(calledPath()).toBe('/manager/requests/?ordering=-created_at')
  })

  it('combines search, status and ordering', () => {
    managerServiceRequestApi.listAll({
      search: 'آسانسور',
      status: 'Assigned',
      ordering: 'created_at',
    })

    const path = calledPath()
    const query = new URLSearchParams(path.split('?')[1])
    expect(query.get('search')).toBe('آسانسور')
    expect(query.get('status')).toBe('Assigned')
    expect(query.get('ordering')).toBe('created_at')
  })

  it('drops blank values instead of sending empty parameters', () => {
    managerServiceRequestApi.listAll({ search: '   ', status: '', ordering: '  ' })
    expect(calledPath()).toBe('/manager/requests/')
  })

  it('still accepts a bare search string, the shape the reports view uses', () => {
    managerServiceRequestApi.listAll('نشتی')
    expect(calledPath()).toBe(`/manager/requests/?search=${encodeURIComponent('نشتی')}`)
  })

  it('sends explicit creation date boundaries', () => {
    managerServiceRequestApi.listAll({
      createdAfter: '۱۴۰۵/۰۵/۲۷',
      createdBefore: '۱۴۰۵/۰۵/۲۷',
    })
    const query = new URLSearchParams(calledPath().split('?')[1])
    expect(query.get('created_after')).toBe('۱۴۰۵/۰۵/۲۷')
    expect(query.get('created_before')).toBe('۱۴۰۵/۰۵/۲۷')
  })

  it('encodes values that need it', () => {
    managerServiceRequestApi.listAll({ search: 'a&b=c' })
    expect(calledPath()).toBe('/manager/requests/?search=a%26b%3Dc')
  })
})
