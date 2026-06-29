function validatePasswordStrength(password) {
  if (password.length < 8) {
    return 'گذرواژه باید حداقل 8 کاراکتر باشد.'
  }

  if (!/[A-Za-z]/.test(password)) {
    return 'گذرواژه باید حداقل شامل یک حرف انگلیسی باشد.'
  }

  if (!/\d/.test(password)) {
    return 'گذرواژه باید حداقل شامل یک عدد باشد.'
  }

  return ''
}

export function validateRegister(values) {
  const errors = {}

  if (!values.full_name.trim()) {
    errors.full_name = 'نام و نام خانوادگی الزامی است.'
  }

  if (!/^09\d{9}$/.test(values.phone)) {
    errors.phone = 'شماره موبایل معتبر نیست.'
  }

  if (!/^\d{10}$/.test(values.national_id)) {
    errors.national_id = 'کد ملی معتبر نیست.'
  }

  const passwordError = validatePasswordStrength(values.password)
  if (passwordError) {
    errors.password = passwordError
  }

  if (values.password_confirmation !== values.password) {
    errors.password_confirmation = 'تکرار گذرواژه با گذرواژه یکسان نیست.'
  }

  return errors
}

export function validateLogin(values) {
  const errors = {}

  if (!/^09\d{9}$/.test(values.phone)) {
    errors.phone = 'شماره موبایل معتبر نیست.'
  }

  if (!values.password) {
    errors.password = 'گذرواژه الزامی است.'
  }

  return errors
}

export function validateAdminPasswordChange(values) {
  const errors = {}

  if (!values.current_password) {
    errors.current_password = 'گذرواژه فعلی الزامی است.'
  }

  const passwordError = validatePasswordStrength(values.new_password)
  if (passwordError) {
    errors.new_password = passwordError
  }

  if (values.new_password_confirmation !== values.new_password) {
    errors.new_password_confirmation = 'تکرار گذرواژه جدید با گذرواژه جدید یکسان نیست.'
  }

  return errors
}
