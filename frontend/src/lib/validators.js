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

  if (!/^\d{6}$/.test(values.password)) {
    errors.password = 'گذرواژه باید دقیقاً 6 رقم باشد.'
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

  if (!/^\d{6}$/.test(values.password)) {
    errors.password = 'گذرواژه باید دقیقاً 6 رقم باشد.'
  }

  return errors
}

export function validateManagerBootstrap(values) {
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

  if (!/^\d{6}$/.test(values.password)) {
    errors.password = 'گذرواژه باید دقیقاً 6 رقم باشد.'
  }

  return errors
}
