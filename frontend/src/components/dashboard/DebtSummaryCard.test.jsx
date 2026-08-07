import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DebtSummaryCard } from './DebtSummaryCard'

const unit = (debt) => ({
  id: 1,
  unit_number: '102',
  floor: 1,
  area: '85.00',
  building: 1,
  details: '',
  unit_debt: debt,
})

describe('DebtSummaryCard', () => {
  it('shows a loading skeleton while loading', () => {
    render(<DebtSummaryCard unit={null} loading />)
    expect(screen.getByLabelText('خلاصه بدهی')).toBeInTheDocument()
  })

  it('renders a green state when the debt is zero', () => {
    render(<DebtSummaryCard unit={unit('0.00')} loading={false} />)
    expect(screen.getByText('مجموع بدهی واحد شما')).toBeInTheDocument()
    expect(screen.getByText('مبلغی پرداخت‌نشده ندارید')).toBeInTheDocument()
    expect(screen.getByText('0 تومان')).toBeInTheDocument()
  })

  it('renders a red state with a formatted amount when there is debt', () => {
    render(<DebtSummaryCard unit={unit('1250000.00')} loading={false} />)
    expect(screen.getByText('بدهی پرداخت‌نشده دارید')).toBeInTheDocument()
    expect(screen.getByText('1,250,000 تومان')).toBeInTheDocument()
  })

  it('treats a missing unit as a cleared balance', () => {
    render(<DebtSummaryCard unit={null} loading={false} />)
    expect(screen.getByText('مبلغی پرداخت‌نشده ندارید')).toBeInTheDocument()
    expect(screen.getByText('0 تومان')).toBeInTheDocument()
  })
})
