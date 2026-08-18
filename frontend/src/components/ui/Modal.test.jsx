import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function ExampleModal(props = {}) {
  return (
    <Modal open title="عنوان پنجره" onClose={vi.fn()} {...props}>
      <button type="button">اول</button>
      <button type="button">آخر</button>
    </Modal>
  )
}

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(<Modal open={false} title="بسته" onClose={vi.fn()}>content</Modal>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ExampleModal onClose={onClose} />)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<ExampleModal onClose={onClose} />)

    fireEvent.click(screen.getByTestId('modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close from Escape, backdrop, or the close button while loading', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ExampleModal onClose={onClose} loading />)

    await user.keyboard('{Escape}')
    fireEvent.click(screen.getByTestId('modal-backdrop'))
    await user.click(screen.getByRole('button', { name: 'بستن' }))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('restores the body overflow style after closing', () => {
    document.body.style.overflow = 'auto'
    const { rerender } = render(<ExampleModal />)
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    rerender(<ExampleModal open={false} />)
    expect(document.body).toHaveStyle({ overflow: 'auto' })
  })

  it('honours closeOnBackdrop=false', () => {
    const onClose = vi.fn()
    render(<ExampleModal onClose={onClose} closeOnBackdrop={false} />)

    fireEvent.click(screen.getByTestId('modal-backdrop'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('focuses inside the dialog, traps Tab, and restores the opener focus', async () => {
    const user = userEvent.setup()
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const { rerender } = render(<ExampleModal />)
    expect(screen.getByRole('button', { name: 'بستن' })).toHaveFocus()

    screen.getByRole('button', { name: 'آخر' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'بستن' })).toHaveFocus()

    rerender(<ExampleModal open={false} />)
    expect(opener).toHaveFocus()
    opener.remove()
  })
})
