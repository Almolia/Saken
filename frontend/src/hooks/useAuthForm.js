import { useState } from 'react'

export function useAuthForm(initialValues, validate, submitAction) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setServerError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setLoading(true)
    setServerError('')

    try {
      await submitAction(values)
    } catch (error) {
      setServerError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return {
    values,
    errors,
    serverError,
    loading,
    handleChange,
    handleSubmit,
    setValues,
  }
}
