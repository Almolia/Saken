import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/ToastProvider'
import { managerApi } from '../../../lib/api'
import { UnitsSection } from './UnitsSection'

vi.mock('../../../lib/api', () => ({
  managerApi: {
    units: vi.fn(),
    createUnit: vi.fn(),
    assignUnit: vi.fn(),
    updateUnit: vi.fn(),
    deleteUnit: vi.fn(),
  },
}))

const occupiedUnit = {
  id: 1,
  unit_number: '101',
  floor: 1,
  area: '75.00',
  building: 1,
  details: '',
  occupancy_status: 'Occupied',
  owner: { id: 7, full_name: 'علی محمدزاده', phone: '09120000000' },
}

const vacantUnit = {
  id: 2,
  unit_number: '102',
  floor: 1,
  area: '85.00',
  building: 1,
  details: '',
  occupancy_status: 'Vacant',
  owner: null,
}

const renovatingUnit = {
  id: 3,
  unit_number: '201',
  floor: 2,
  area: '95.00',
  building: 1,
  details: '',
  occupancy_status: 'UnderRenovation',
  owner: null,
}

const users = [
  { id: 7, full_name: 'علی محمدزاده', phone: '09120000000', role: 'resident' },
  { id: 8, full_name: 'سارا احمدی', phone: '09121111111', role: 'resident' },
]

function renderSection() {
  return render(
    <ToastProvider>
      <UnitsSection users={users} />
    </ToastProvider>,
  )
}

const rowFor = (unitNumber) => within(screen.getByRole('row', { name: new RegExp(unitNumber) }))

describe('UnitsSection', () => {
  beforeEach(() => {
    managerApi.units.mockReset()
    managerApi.createUnit.mockReset()
    managerApi.assignUnit.mockReset()
    managerApi.updateUnit.mockReset()
    managerApi.deleteUnit.mockReset()
    managerApi.units.mockResolvedValue({ units: [occupiedUnit, vacantUnit, renovatingUnit] })
  })

  it('renders every unit with its number, occupancy status and resident', async () => {
    renderSection()

    expect(await screen.findByRole('heading', { name: 'فهرست واحدها' })).toBeInTheDocument()

    expect(rowFor('101').getByText('سکونت‌دار')).toBeInTheDocument()
    expect(rowFor('101').getByText('علی محمدزاده')).toBeInTheDocument()

    expect(rowFor('102').getByText('خالی')).toBeInTheDocument()
    expect(rowFor('102').getByText('بدون ساکن')).toBeInTheDocument()

    expect(rowFor('201').getByText('در حال بازسازی')).toBeInTheDocument()
  })

  it('flags a unit whose occupancy status disagrees with its resident', async () => {
    managerApi.units.mockResolvedValue({
      units: [{ ...vacantUnit, owner: { id: 8, full_name: 'سارا احمدی', phone: '09121111111' } }],
    })
    renderSection()

    expect(await screen.findByText('با وضعیت ساکن هم‌خوانی ندارد')).toBeInTheDocument()
  })

  it('edits the occupancy status through the modal and updates the row', async () => {
    const user = userEvent.setup()
    managerApi.updateUnit.mockResolvedValue({
      message: 'اطلاعات واحد با موفقیت به‌روزرسانی شد.',
      unit: { ...occupiedUnit, occupancy_status: 'UnderRenovation' },
    })
    renderSection()

    await screen.findByRole('heading', { name: 'فهرست واحدها' })
    await user.click(rowFor('101').getByRole('button', { name: 'ویرایش واحد 101' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'ویرایش واحد 101' }))
    expect(dialog.getByRole('radio', { name: /سکونت‌دار/ })).toBeChecked()

    await user.click(dialog.getByRole('radio', { name: /در حال بازسازی/ }))
    await user.click(dialog.getByRole('button', { name: 'ذخیره وضعیت' }))

    expect(managerApi.updateUnit).toHaveBeenCalledWith(1, { occupancy_status: 'UnderRenovation' })
    expect(await screen.findByText('اطلاعات واحد با موفقیت به‌روزرسانی شد.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(rowFor('101').getByText('در حال بازسازی')).toBeInTheDocument()
  })

  it('keeps the edit modal open and reports why the server refused', async () => {
    const user = userEvent.setup()
    managerApi.updateUnit.mockRejectedValue(
      Object.assign(new Error('مقدار نامعتبر است.'), { status: 400 }),
    )
    renderSection()

    await screen.findByRole('heading', { name: 'فهرست واحدها' })
    await user.click(rowFor('101').getByRole('button', { name: 'ویرایش واحد 101' }))
    await user.click(screen.getByRole('radio', { name: /خالی/ }))
    await user.click(screen.getByRole('button', { name: 'ذخیره وضعیت' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('مقدار نامعتبر است.')
    expect(screen.getByRole('dialog', { name: 'ویرایش واحد 101' })).toBeInTheDocument()
    expect(rowFor('101').getByText('سکونت‌دار')).toBeInTheDocument()
  })

  it('only offers the unlink action for units that have a resident', async () => {
    renderSection()

    await screen.findByRole('heading', { name: 'فهرست واحدها' })
    expect(rowFor('101').getByRole('button', { name: 'حذف ساکن واحد 101' })).toBeInTheDocument()
    expect(rowFor('102').queryByRole('button', { name: /حذف ساکن/ })).not.toBeInTheDocument()
    expect(rowFor('102').getByRole('button', { name: /تعیین ساکن/ })).toBeInTheDocument()
  })

  it('asks for confirmation before unlinking, then PATCHes resident_id: null', async () => {
    const user = userEvent.setup()
    managerApi.updateUnit.mockResolvedValue({
      message: 'اطلاعات واحد با موفقیت به‌روزرسانی شد.',
      unit: { ...occupiedUnit, owner: null },
    })
    renderSection()

    await screen.findByRole('heading', { name: 'فهرست واحدها' })
    await user.click(rowFor('101').getByRole('button', { name: 'حذف ساکن واحد 101' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'حذف ساکن واحد' }))
    expect(dialog.getByText('آیا از حذف ساکن واحد 101 اطمینان دارید؟')).toBeInTheDocument()
    expect(dialog.getByText('علی محمدزاده')).toBeInTheDocument()
    expect(managerApi.updateUnit).not.toHaveBeenCalled()

    await user.click(dialog.getByRole('button', { name: 'بله، ساکن حذف شود' }))

    expect(managerApi.updateUnit).toHaveBeenCalledWith(1, { resident_id: null })
    expect(await screen.findByText('اطلاعات واحد با موفقیت به‌روزرسانی شد.')).toBeInTheDocument()
    await waitFor(() => expect(rowFor('101').getByText('بدون ساکن')).toBeInTheDocument())
    expect(rowFor('101').queryByRole('button', { name: /حذف ساکن/ })).not.toBeInTheDocument()
  })

  it('leaves the unit untouched when the confirmation is dismissed', async () => {
    const user = userEvent.setup()
    renderSection()

    await screen.findByRole('heading', { name: 'فهرست واحدها' })
    await user.click(rowFor('101').getByRole('button', { name: 'حذف ساکن واحد 101' }))
    await user.click(screen.getByRole('button', { name: 'انصراف' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(managerApi.updateUnit).not.toHaveBeenCalled()
    expect(rowFor('101').getByText('علی محمدزاده')).toBeInTheDocument()
  })

  it('shows the summary counts and a retryable error state', async () => {
    const user = userEvent.setup()
    managerApi.units
      .mockRejectedValueOnce(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
      .mockResolvedValueOnce({ units: [occupiedUnit, vacantUnit, renovatingUnit] })
    renderSection()

    expect(await screen.findByText('خطایی در ارتباط با سرور رخ داد.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'تلاش مجدد' }))

    await screen.findByText('3 واحد ثبت شده است.')
    const totals = screen.getByText('کل واحدها').closest('div')
    expect(within(totals).getByText('3')).toBeInTheDocument()
  })
})
