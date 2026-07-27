import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../ToastProvider'
import { serviceRequestApi } from '../../lib/serviceRequestApi'
import { ServiceRequestForm } from './ServiceRequestForm'

vi.mock('../../lib/serviceRequestApi', () => ({
  serviceRequestApi: {
    create: vi.fn(),
  },
}))

function renderForm(onRequestCreated = vi.fn()) {
  render(
    <ToastProvider>
      <ServiceRequestForm onRequestCreated={onRequestCreated} />
    </ToastProvider>,
  )

  return { onRequestCreated }
}

describe('ServiceRequestForm', () => {
  it('validates both required fields before sending a request', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'ثبت درخواست' }))

    expect(screen.getByText('عنوان درخواست را وارد کنید.')).toBeInTheDocument()
    expect(screen.getByText('شرح مشکل را وارد کنید.')).toBeInTheDocument()
    expect(serviceRequestApi.create).not.toHaveBeenCalled()
  })

  it('submits trimmed values, clears the form, and adds the new request to the list', async () => {
    const user = userEvent.setup()
    const createdRequest = {
      id: 12,
      title: 'نشتی شیر آب',
      description: 'شیر آب آشپزخانه چکه می‌کند.',
      status: 'Pending',
    }
    const { onRequestCreated } = renderForm()
    serviceRequestApi.create.mockResolvedValueOnce(createdRequest)

    await user.type(screen.getByLabelText('عنوان درخواست'), '  نشتی شیر آب  ')
    await user.type(screen.getByLabelText('شرح مشکل'), '  شیر آب آشپزخانه چکه می‌کند.  ')
    await user.click(screen.getByRole('button', { name: 'ثبت درخواست' }))

    expect(await screen.findByText('درخواست خدمات شما با موفقیت ثبت شد.')).toBeInTheDocument()
    expect(serviceRequestApi.create).toHaveBeenCalledWith({
      title: 'نشتی شیر آب',
      description: 'شیر آب آشپزخانه چکه می‌کند.',
    })
    expect(onRequestCreated).toHaveBeenCalledWith(createdRequest)
    expect(screen.getByLabelText('عنوان درخواست')).toHaveValue('')
    expect(screen.getByLabelText('شرح مشکل')).toHaveValue('')
  })

  it('shows an error toast and inline error when submission fails', async () => {
    const user = userEvent.setup()
    renderForm()
    serviceRequestApi.create.mockRejectedValueOnce(new Error('دسترسی برای ثبت درخواست وجود ندارد.'))

    await user.type(screen.getByLabelText('عنوان درخواست'), 'خرابی آسانسور')
    await user.type(screen.getByLabelText('شرح مشکل'), 'آسانسور در طبقه سوم متوقف شده است.')
    await user.click(screen.getByRole('button', { name: 'ثبت درخواست' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('دسترسی برای ثبت درخواست وجود ندارد.')
  })
})
