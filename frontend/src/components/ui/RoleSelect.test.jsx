import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoleSelect } from './RoleSelect'

describe('RoleSelect', () => {
  it('offers the three assignable roles and never admin', () => {
    render(<RoleSelect value="resident" onChange={() => {}} label="نقش کاربر" />)

    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['ساکن', 'مدیر', 'کارکنان خدمات'])
    expect(options).not.toContain('ادمین')
  })

  it('reports the newly picked role', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RoleSelect value="resident" onChange={onChange} label="نقش کاربر" />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'نقش کاربر' }), 'service_staff')

    expect(onChange).toHaveBeenCalledWith('service_staff')
  })

  it('shows the current role as the selected value', () => {
    render(<RoleSelect value="service_staff" onChange={() => {}} label="نقش کاربر" />)

    expect(screen.getByRole('combobox', { name: 'نقش کاربر' })).toHaveValue('service_staff')
  })

  it('is disabled while a change is in flight', () => {
    render(<RoleSelect value="resident" onChange={() => {}} loading label="نقش کاربر" />)

    expect(screen.getByRole('combobox', { name: 'نقش کاربر' })).toBeDisabled()
  })

  it('is disabled when explicitly locked', () => {
    render(<RoleSelect value="resident" onChange={() => {}} disabled label="نقش کاربر" />)

    expect(screen.getByRole('combobox', { name: 'نقش کاربر' })).toBeDisabled()
  })
})
