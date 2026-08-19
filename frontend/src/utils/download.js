/**
 * Hand the browser a generated file to save.
 *
 * The content is built in the page, so there is nothing to request from the
 * server: it becomes a blob URL, an anchor click opens the browser's own save
 * dialog, and the URL is released straight away so the blob is not held in
 * memory for the rest of the session.
 */
export function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8;') {
  // Older browsers, and jsdom, have no object URL support; the caller treats a
  // false return as "the export is unavailable here" rather than crashing.
  if (typeof URL?.createObjectURL !== 'function') return false

  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  return true
}
