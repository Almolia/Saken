import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnitInfoCard } from './UnitInfoCard'

const sampleUnit = {
  id: 1,
  unit_number: '102',
  floor: 1,
  area: '85.00',
  building: 1,
  details: '',
}

describe('UnitInfoCard', () => {
  it('shows a loading skeleton while data is loading', () => {
    render(<UnitInfoCard unit={null} loading error="" onRetry={() => {}} />)

    expect(screen.getByRole('status', { name: 'در حال بارگذاری اطلاعات واحد' })).toBeInTheDocument()
    expect(screen.queryByText('شماره واحد')).not.toBeInTheDocument()
  })

  it('renders unit number, floor and formatted area on success', () => {
    render(<UnitInfoCard unit={sampleUnit} loading={false} error="" onRetry={() => {}} />)

    expect(screen.getByText('شماره واحد')).toBeInTheDocument()
    expect(screen.getByText('102')).toBeInTheDocument()
    expect(screen.getByText('طبقه')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('متراژ')).toBeInTheDocument()
    expect(screen.getByText('85 متر مربع')).toBeInTheDocument()
  })

  it('keeps a decimal area as-is when it is not a whole number', () => {
    render(<UnitInfoCard unit={{ ...sampleUnit, area: '85.50' }} loading={false} error="" onRetry={() => {}} />)

    expect(screen.getByText('85.5 متر مربع')).toBeInTheDocument()
  })

  it('shows the error UI with the server message when fetching fails', () => {
    render(<UnitInfoCard unit={null} loading={false} error="ارتباط با سرور برقرار نشد." onRetry={() => {}} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('دریافت اطلاعات واحد ناموفق بود')).toBeInTheDocument()
    expect(screen.getByText('ارتباط با سرور برقرار نشد.')).toBeInTheDocument()
  })

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<UnitInfoCard unit={null} loading={false} error="خطا" onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: /تلاش مجدد/ }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when no unit is assigned', () => {
    render(<UnitInfoCard unit={null} loading={false} error="" onRetry={() => {}} />)

    expect(screen.getByText(/هنوز واحدی برای شما ثبت نشده است/)).toBeInTheDocument()
  })
})
