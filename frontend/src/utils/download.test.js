import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile } from './download'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function stubObjectUrls() {
  const createObjectURL = vi.fn(() => 'blob:generated')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
  return { createObjectURL, revokeObjectURL }
}

describe('downloadTextFile', () => {
  it('saves the content under the given name and releases the blob URL', () => {
    const { createObjectURL, revokeObjectURL } = stubObjectUrls()
    const clicked = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      clicked.push({ href: this.href, download: this.download })
    })

    expect(downloadTextFile('history.csv', 'a,b', 'text/csv;charset=utf-8;')).toBe(true)

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clicked).toEqual([{ href: 'blob:generated', download: 'history.csv' }])
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:generated')
  })

  it('leaves no anchor behind in the document', () => {
    stubObjectUrls()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadTextFile('history.csv', 'a,b')

    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('reports failure instead of throwing where object URLs are unavailable', () => {
    vi.stubGlobal('URL', {})

    expect(downloadTextFile('history.csv', 'a,b')).toBe(false)
  })
})
