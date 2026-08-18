import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AmenityFormModal } from './AmenityFormModal'

const amenityA = {
  id: 1,
  name: 'باشگاه',
  description: 'طبقه همکف',
  operating_rules: '۸ تا ۲۲',
  is_active: true,
}

const amenityB = {
  id: 2,
  name: 'استخر',
  description: 'طبقه منفی یک',
  operating_rules: '۹ تا ۲۰',
  is_active: false,
}

describe('AmenityFormModal', () => {
  it('syncs a different amenity without overwriting typing on same-record rerenders', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSubmit = vi.fn()
    const { rerender } = render(
      <AmenityFormModal open amenity={amenityA} onClose={onClose} onSubmit={onSubmit} />,
    )

    const name = screen.getByLabelText('نام امکان')
    expect(name).toHaveValue('باشگاه')
    await user.clear(name)
    await user.type(name, 'نام در حال ویرایش')

    rerender(
      <AmenityFormModal
        open
        amenity={{ ...amenityA }}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    )
    expect(name).toHaveValue('نام در حال ویرایش')

    rerender(
      <AmenityFormModal open amenity={amenityB} onClose={onClose} onSubmit={onSubmit} />,
    )

    await waitFor(() => expect(name).toHaveValue('استخر'))
    expect(screen.getByPlaceholderText('توضیحات مربوط به این امکان...')).toHaveValue(
      'طبقه منفی یک',
    )
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })
})
