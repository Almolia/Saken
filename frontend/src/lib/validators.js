export function getPasswordIssues(password) {
  const issues = []

  if (password.length < 8) {
    issues.push('حداقل ۸ کاراکتر')
  }

  if (!/[A-Za-z]/.test(password)) {
    issues.push('حداقل یک حرف انگلیسی')
  }

  if (!/\d/.test(password)) {
    issues.push('حداقل یک عدد')
  }

  return issues
}

function validatePasswordStrength(password) {
  const issues = getPasswordIssues(password)
  if (issues.length > 0) {
    return `گذرواژه کافی نیست؛ ${issues.join('، ')} لازم است.`
  }

  return ''
}

export function validateUnit(values) {
  const errors = {}

  if (!values.unit_number.trim()) {
    errors.unit_number = 'شماره واحد الزامی است.'
  }

  if (!/^-?\d+$/.test(values.floor.trim())) {
    errors.floor = 'طبقه باید یک عدد صحیح باشد.'
  }

  const area = Number.parseFloat(values.area)
  if (Number.isNaN(area) || area <= 0) {
    errors.area = 'متراژ باید یک عدد بزرگ‌تر از صفر باشد.'
  }

  return errors
}

export function validateRegister(values) {
  const errors = {}

  if (!values.full_name.trim()) {
    errors.full_name = 'نام و نام خانوادگی الزامی است.'
  }

  if (values.username && values.username.trim().length < 3) {
    errors.username = 'نام کاربری باید حداقل 3 کاراکتر باشد.'
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

  if (!values.login?.trim()) {
    errors.login = 'نام کاربری، شماره موبایل یا کد ملی الزامی است.'
  }

  if (!values.password) {
    errors.password = 'گذرواژه الزامی است.'
  }

  return errors
}

export function validateAdminProfile(values) {
  const errors = {}

  if (!values.full_name.trim()) {
    errors.full_name = 'نام و نام خانوادگی الزامی است.'
  }

  if (!values.username.trim()) {
    errors.username = 'نام کاربری الزامی است.'
  } else if (values.username.trim().length < 3) {
    errors.username = 'نام کاربری باید حداقل 3 کاراکتر باشد.'
  }

  if (!/^09\d{9}$/.test(values.phone)) {
    errors.phone = 'شماره موبایل معتبر نیست.'
  }

  if (!/^\d{10}$/.test(values.national_id)) {
    errors.national_id = 'کد ملی معتبر نیست.'
  }

  const wantsPasswordChange = Boolean(values.current_password || values.new_password || values.new_password_confirmation)
  if (wantsPasswordChange) {
    if (!values.current_password) {
      errors.current_password = 'برای تغییر گذرواژه، رمز فعلی الزامی است.'
    }

    const passwordError = validatePasswordStrength(values.new_password)
    if (passwordError) {
      errors.new_password = passwordError
    }

    if (values.new_password_confirmation !== values.new_password) {
      errors.new_password_confirmation = 'تکرار رمز جدید با رمز جدید یکسان نیست.'
    }
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
