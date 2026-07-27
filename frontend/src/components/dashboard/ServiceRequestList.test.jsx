import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ServiceRequestList } from './ServiceRequestList'

const requests = [
  {
    id: 1,
    title: 'نشتی آب',
    description: 'سینک آشپزخانه نشتی دارد.',
    status: 'Pending',
    work_report: '',
  },
  {
    id: 2,
    title: 'خرابی آسانسور',
    description: 'دکمه طبقه سوم کار نمی‌کند.',
    status: 'Assigned',
    work_report: null,
  },
  {
    id: 3,
    title: 'تعویض لامپ راهرو',
    description: 'لامپ راهرو طبقه دوم سوخته است.',
    status: 'Completed',
    work_report: 'لامپ تعویض و روشنایی بررسی شد.',
  },
]

function renderList(props = {}) {
  return render(
    <ServiceRequestList
      requests={requests}
      loading={false}
      refreshing={false}
      error=""
      onRetry={vi.fn()}
      {...props}
    />,
  )
}

describe('ServiceRequestList', () => {
  it('renders every request with a localized status indicator', () => {
    renderList()

    expect(screen.getByText('نشتی آب')).toBeInTheDocument()
    expect(screen.getByText('در انتظار بررسی')).toBeInTheDocument()
    expect(screen.getByText('ارجاع‌شده')).toBeInTheDocument()
    expect(screen.getByText('تکمیل‌شده')).toBeInTheDocument()
  })

  it('only renders a completed request work report when the report is populated', () => {
    renderList()

    expect(screen.getByText('گزارش انجام کار')).toBeInTheDocument()
    expect(screen.getByText('لامپ تعویض و روشنایی بررسی شد.')).toBeInTheDocument()
  })

  it('shows an empty state when no requests have been submitted', () => {
    renderList({ requests: [] })

    expect(screen.getByText('هنوز درخواستی ثبت نشده است')).toBeInTheDocument()
  })
})
