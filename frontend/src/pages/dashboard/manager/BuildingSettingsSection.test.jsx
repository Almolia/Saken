import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/ToastProvider'
import { managerApi } from '../../../lib/api'
import { BuildingSettingsSection } from './BuildingSettingsSection'

vi.mock('../../../lib/api', () => ({
  managerApi: {
    building: vi.fn(),
    createBuilding: vi.fn(),
    updateBuilding: vi.fn(),
  },
}))

const sampleBuilding = {
  id: 1,
  name: 'برج ساکن',
  building_wallet_balance: '5000000.00',
  total_units: 12,
}

function renderSection() {
  return render(
    <ToastProvider>
      <BuildingSettingsSection />
    </ToastProvider>,
  )
}

const nameField = () => screen.getByLabelText('نام ساختمان')
const balanceField = () => screen.getByLabelText(/موجودی صندوق ساختمان/)

describe('BuildingSettingsSection', () => {
  beforeEach(() => {
    managerApi.building.mockReset()
    managerApi.createBuilding.mockReset()
    managerApi.updateBuilding.mockReset()
    managerApi.building.mockResolvedValue(sampleBuilding)
  })

  it('shows the loading state, then populates the form with the current building', async () => {
    renderSection()

    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument()

    expect(await screen.findByRole('heading', { name: 'ویرایش اطلاعات ساختمان' })).toBeInTheDocument()
    expect(nameField()).toHaveValue('برج ساکن')
    expect(balanceField()).toHaveValue('5000000.00')
    // Total units is derived from the unit directory, so it is only reported.
    expect(screen.getByText('کل واحدها')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('5,000,000 تومان')).toBeInTheDocument()
  })

  it('saves the edited fields through the PATCH endpoint and toasts the result', async () => {
    const user = userEvent.setup()
    managerApi.updateBuilding.mockResolvedValue({
      message: 'اطلاعات ساختمان با موفقیت به‌روزرسانی شد.',
      building: { ...sampleBuilding, name: 'برج نو', building_wallet_balance: '7500000.00' },
    })
    renderSection()

    await screen.findByRole('heading', { name: 'ویرایش اطلاعات ساختمان' })
    await user.clear(nameField())
    await user.type(nameField(), 'برج نو')
    await user.clear(balanceField())
    await user.type(balanceField(), '7500000')
    await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }))

    expect(managerApi.updateBuilding).toHaveBeenCalledWith({
      name: 'برج نو',
      building_wallet_balance: '7500000',
    })
    expect(await screen.findByText('اطلاعات ساختمان با موفقیت به‌روزرسانی شد.')).toBeInTheDocument()
    // The summary card follows the copy the server returned.
    await waitFor(() => expect(screen.getByText('7,500,000 تومان')).toBeInTheDocument())
  })

  it('refuses to submit an empty name or a negative balance', async () => {
    const user = userEvent.setup()
    renderSection()

    await screen.findByRole('heading', { name: 'ویرایش اطلاعات ساختمان' })
    await user.clear(nameField())
    await user.clear(balanceField())
    await user.type(balanceField(), '-5')
    await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }))

    expect(screen.getByText('نام ساختمان الزامی است.')).toBeInTheDocument()
    expect(screen.getByText('موجودی صندوق ساختمان نمی‌تواند منفی باشد.')).toBeInTheDocument()
    expect(managerApi.updateBuilding).not.toHaveBeenCalled()
  })

  it('surfaces a rejected save both inline and as an error toast', async () => {
    const user = userEvent.setup()
    managerApi.updateBuilding.mockRejectedValue(
      Object.assign(new Error('موجودی صندوق ساختمان نمی‌تواند منفی باشد.'), { status: 400 }),
    )
    renderSection()

    await screen.findByRole('heading', { name: 'ویرایش اطلاعات ساختمان' })
    await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }))

    await waitFor(() =>
      expect(screen.getAllByText('موجودی صندوق ساختمان نمی‌تواند منفی باشد.')).toHaveLength(2),
    )
  })

  it('offers a registration form when no building has been recorded yet', async () => {
    const user = userEvent.setup()
    managerApi.building.mockRejectedValue(
      Object.assign(new Error('اطلاعات ساختمان هنوز ثبت نشده است.'), { status: 404 }),
    )
    managerApi.createBuilding.mockResolvedValue({
      message: 'اطلاعات ساختمان با موفقیت ثبت شد.',
      building: { id: 2, name: 'برج تازه', building_wallet_balance: '0.00', total_units: 0 },
    })
    renderSection()

    expect(await screen.findByRole('heading', { name: 'ثبت اطلاعات ساختمان' })).toBeInTheDocument()
    expect(nameField()).toHaveValue('')

    await user.type(nameField(), 'برج تازه')
    await user.type(balanceField(), '0')
    await user.click(screen.getByRole('button', { name: 'ثبت اطلاعات ساختمان' }))

    expect(managerApi.createBuilding).toHaveBeenCalledWith({
      name: 'برج تازه',
      building_wallet_balance: '0',
    })
    expect(await screen.findByText('اطلاعات ساختمان با موفقیت ثبت شد.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'ویرایش اطلاعات ساختمان' })).toBeInTheDocument()
  })

  it('shows a retryable error when the building cannot be read', async () => {
    const user = userEvent.setup()
    managerApi.building
      .mockRejectedValueOnce(Object.assign(new Error('خطایی در ارتباط با سرور رخ داد.'), { status: 500 }))
      .mockResolvedValueOnce(sampleBuilding)
    renderSection()

    expect(await screen.findByText('خطایی در ارتباط با سرور رخ داد.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تلاش مجدد' }))
    expect(await screen.findByLabelText('نام ساختمان')).toHaveValue('برج ساکن')
  })
})
