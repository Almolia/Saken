import { useState } from 'react'

export function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ loading: false, serverError: '' })

  function setFieldValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setStatus((current) => ({ ...current, serverError: '' }))
  }

  function handleChange(event) {
    const { name, value } = event.target
    setFieldValue(name, value)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setStatus({ loading: true, serverError: '' })

    try {
      await onSubmit(values)
    } catch (error) {
      setStatus({ loading: false, serverError: error.message })
      return
    }

    setStatus({ loading: false, serverError: '' })
  }

  return {
    values,
    errors,
    loading: status.loading,
    serverError: status.serverError,
    handleChange,
    handleSubmit,
    setFieldValue,
    setValues,
  }
}
