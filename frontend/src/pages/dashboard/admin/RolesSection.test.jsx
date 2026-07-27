import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RolesSection } from './RolesSection'

const admin = { id: 1, full_name: 'ادمین سیستم', username: 'admin', phone: '09130000000', national_id: '0000000000', role: 'admin' }
const resident = { id: 2, full_name: 'سارا احمدی', username: 'sara', phone: '09121111111', national_id: '1234567891', role: 'resident' }
const staff = { id: 3, full_name: 'متین محمودی', username: 'matin', phone: '09120000009', national_id: '1234500009', role: 'service_staff' }

const users = [admin, resident, staff]

const data = {
  users,
  stats: { total: 3, managers: 0, residents: 1, service_staff: 1 },
  loading: false,
  error: '',
}

function renderSection(overrides = {}) {
  const changeRole = vi.fn()
  render(
    <RolesSection
      data={data}
      filteredUsers={users}
      search=""
      setSearch={() => {}}
      authState={{ loading: false, user: admin }}
      actionState={{}}
      changeRole={changeRole}
      {...overrides}
    />,
  )
  return { changeRole }
}

describe('RolesSection', () => {
  it('grants the service staff role through the picker', async () => {
    const user = userEvent.setup()
    const { changeRole } = renderSection()

    await user.selectOptions(screen.getByRole('combobox', { name: 'نقش سارا احمدی' }), 'service_staff')

    expect(changeRole).toHaveBeenCalledWith(resident, 'service_staff')
  })

  it('can move a service staff member back to resident', async () => {
    const user = userEvent.setup()
    const { changeRole } = renderSection()

    await user.selectOptions(screen.getByRole('combobox', { name: 'نقش متین محمودی' }), 'resident')

    expect(changeRole).toHaveBeenCalledWith(staff, 'resident')
  })

  it('reflects the current role of each user', () => {
    renderSection()

    expect(screen.getByRole('combobox', { name: 'نقش سارا احمدی' })).toHaveValue('resident')
    expect(screen.getByRole('combobox', { name: 'نقش متین محمودی' })).toHaveValue('service_staff')
  })

  it('does not offer a picker for the admin row', () => {
    renderSection()

    expect(screen.queryByRole('combobox', { name: 'نقش ادمین سیستم' })).not.toBeInTheDocument()
  })

  it('locks the picker for the signed-in user', () => {
    renderSection({ authState: { loading: false, user: resident } })

    expect(screen.getByRole('combobox', { name: 'نقش سارا احمدی' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'نقش متین محمودی' })).toBeEnabled()
  })

  it('shows the service staff count in the summary cards', () => {
    renderSection()

    // The label also appears in role badges and picker options, so match the
    // summary card specifically: its title is a <p> next to the value <h3>.
    const cardTitle = screen.getAllByText('کارکنان خدمات').find((node) => node.tagName === 'P')
    expect(cardTitle).toBeDefined()
    expect(cardTitle.parentElement.querySelector('h3')).toHaveTextContent('1')
  })
})
