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

  if (!values.unit_number?.trim()) {
    errors.unit_number = 'شماره واحد الزامی است.'
  }

  if (!/^-?\d+$/.test(values.floor?.trim?.() ?? String(values.floor ?? ''))) {
    errors.floor = 'طبقه باید یک عدد صحیح باشد.'
  }

  const area = Number.parseFloat(values.area)
  if (Number.isNaN(area) || area <= 0) {
    errors.area = 'متراژ باید یک عدد بزرگ‌تر از صفر باشد.'
  }

  return errors
}

export function validateBuildingSettings(values) {
  const errors = {}

  if (!values.name?.trim()) {
    errors.name = 'نام ساختمان الزامی است.'
  }

  const balanceStr = String(values.building_wallet_balance ?? '').trim()
  if (!balanceStr) {
    errors.building_wallet_balance = 'موجودی صندوق ساختمان الزامی است.'
  } else {
    const balance = Number.parseFloat(balanceStr)
    if (Number.isNaN(balance)) {
      errors.building_wallet_balance = 'موجودی صندوق باید یک عدد باشد.'
    } else if (balance < 0) {
      errors.building_wallet_balance = 'موجودی صندوق ساختمان نمی‌تواند منفی باشد.'
    }
  }

  return errors
}

export function validateCharge(values) {
  const errors = {}

  if (!values.title?.trim()) {
    errors.title = 'عنوان شارژ الزامی است.'
  }

  const amountStr = String(values.amount ?? '').trim()
  if (!amountStr) {
    errors.amount = 'مبلغ به ازای هر واحد الزامی است.'
  } else {
    const amount = Number.parseFloat(amountStr)
    if (Number.isNaN(amount) || amount <= 0) {
      errors.amount = 'مبلغ شارژ باید یک عدد بزرگ‌تر از صفر باشد.'
    }
  }

  if (!values.due_date?.trim()) {
    errors.due_date = 'مهلت پرداخت الزامی است.'
  }

  if (values.apply_to_all === false) {
    const selectedUnits = values.unit_ids || []
    if (!Array.isArray(selectedUnits) || selectedUnits.length === 0) {
      errors.unit_ids = 'حداقل یک واحد باید انتخاب شود.'
    }
  }

  return errors
}

export function validateRegister(values) {
  const errors = {}

  if (!values.full_name?.trim()) {
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

  if (!values.full_name?.trim()) {
    errors.full_name = 'نام و نام خانوادگی الزامی است.'
  }

  if (!values.username?.trim()) {
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

// The title cap mirrors the CharField(max_length=255) on the backend model, so
// an over-long title is caught here instead of coming back as a 400. The body
// is a TextField with no database limit; 4000 keeps an announcement readable.
export const ANNOUNCEMENT_TITLE_MAX = 255
export const ANNOUNCEMENT_CONTENT_MAX = 4000

export function validateAnnouncement(values) {
  const errors = {}
  const title = values.title?.trim() ?? ''
  const content = values.content?.trim() ?? ''

  if (!title) {
    errors.title = 'عنوان اطلاعیه الزامی است.'
  } else if (title.length < 3) {
    errors.title = 'عنوان اطلاعیه باید حداقل ۳ کاراکتر باشد.'
  } else if (title.length > ANNOUNCEMENT_TITLE_MAX) {
    errors.title = `عنوان اطلاعیه نمی‌تواند بیشتر از ${ANNOUNCEMENT_TITLE_MAX} کاراکتر باشد.`
  }

  if (!content) {
    errors.content = 'متن اطلاعیه الزامی است.'
  } else if (content.length < 10) {
    errors.content = 'متن اطلاعیه باید حداقل ۱۰ کاراکتر باشد.'
  } else if (content.length > ANNOUNCEMENT_CONTENT_MAX) {
    errors.content = `متن اطلاعیه نمی‌تواند بیشتر از ${ANNOUNCEMENT_CONTENT_MAX} کاراکتر باشد.`
  }

  return errors
}

export const MESSAGE_SUBJECT_MAX = 255
export const MESSAGE_BODY_MAX = 4000

export function validateMessage(values, { requireSubject = true } = {}) {
  const errors = {}
  const subject = values.subject?.trim() ?? ''
  const body = values.body?.trim() ?? ''

  if (requireSubject) {
    if (!subject) {
      errors.subject = 'موضوع پیام الزامی است.'
    } else if (subject.length > MESSAGE_SUBJECT_MAX) {
      errors.subject = `موضوع پیام نمی‌تواند بیشتر از ${MESSAGE_SUBJECT_MAX} کاراکتر باشد.`
    }
  }

  if (!body) {
    errors.body = 'متن پیام الزامی است.'
  } else if (body.length > MESSAGE_BODY_MAX) {
    errors.body = `متن پیام نمی‌تواند بیشتر از ${MESSAGE_BODY_MAX} کاراکتر باشد.`
  }

  return errors
}

export function validateAmenity(values) {
  const errors = {}

  if (!values.name?.trim()) {
    errors.name = 'نام امکان الزامی است.'
  } else if (values.name.trim().length < 2) {
    errors.name = 'نام امکان باید حداقل ۲ کاراکتر باشد.'
  }

  return errors
}

// The poll form. Every rule here has a counterpart on the server: catching a
// missing option or a deadline in the past before the request is sent keeps the
// manager's typed answers on screen instead of trading them for a 400.
export const POLL_TITLE_MAX = 255
export const POLL_DESCRIPTION_MAX = 4000
export const POLL_OPTION_MAX = 255
export const POLL_MIN_OPTIONS = 2
// Not a server rule. Past a dozen answers a poll stops being answerable at a
// glance, and the form's own list stops being editable at a glance too.
export const POLL_MAX_OPTIONS = 12

export function validatePoll(values, { now = Date.now() } = {}) {
  const errors = {}
  const title = values.title?.trim() ?? ''
  const description = values.description?.trim() ?? ''
  const options = Array.isArray(values.options) ? values.options : []

  if (!title) {
    errors.title = 'عنوان نظرسنجی الزامی است.'
  } else if (title.length < 3) {
    errors.title = 'عنوان نظرسنجی باید حداقل ۳ کاراکتر باشد.'
  } else if (title.length > POLL_TITLE_MAX) {
    errors.title = `عنوان نظرسنجی نمی‌تواند بیشتر از ${POLL_TITLE_MAX} کاراکتر باشد.`
  }

  if (description.length > POLL_DESCRIPTION_MAX) {
    errors.description = `توضیحات نمی‌تواند بیشتر از ${POLL_DESCRIPTION_MAX} کاراکتر باشد.`
  }

  // Blank rows are dropped rather than rejected — an untouched extra row is a
  // manager who changed their mind, not a mistake. Only what is left has to add
  // up to a usable question.
  const filled = options.map((option) => option?.trim() ?? '').filter(Boolean)

  // The options are reported as one list-level message rather than per row:
  // rows are added and removed while the form is open, so an error pinned to an
  // index would end up pointing at whichever option later took that place.
  const tooLong = options.findIndex((option) => (option?.trim() ?? '').length > POLL_OPTION_MAX)

  if (filled.length < POLL_MIN_OPTIONS) {
    errors.options = 'حداقل دو گزینه برای نظرسنجی الزامی است.'
  } else if (new Set(filled).size !== filled.length) {
    errors.options = 'گزینه‌های تکراری مجاز نیستند؛ هر گزینه باید متن یکتا داشته باشد.'
  } else if (tooLong !== -1) {
    errors.options = `متن گزینه ${tooLong + 1} نمی‌تواند بیشتر از ${POLL_OPTION_MAX} کاراکتر باشد.`
  } else if (filled.length > POLL_MAX_OPTIONS) {
    errors.options = `حداکثر ${POLL_MAX_OPTIONS} گزینه می‌توانید ثبت کنید.`
  }

  if (!values.endDate) {
    errors.endDate = 'تاریخ پایان نظرسنجی الزامی است.'
  } else {
    const deadline = new Date(`${values.endDate}T${values.endTime || '23:59'}:00`).getTime()
    if (Number.isNaN(deadline)) {
      errors.endDate = 'تاریخ پایان معتبر نیست.'
    } else if (deadline <= now) {
      errors.endDate = 'زمان پایان باید در آینده باشد.'
    }
  }

  if (!values.targetAll && (values.targetUnitIds?.length ?? 0) === 0) {
    errors.targetUnitIds = 'حداقل یک واحد را انتخاب کنید یا نظرسنجی را برای همه واحدها منتشر کنید.'
  }

  return errors
}

// Which form field each serializer key belongs under. The poll form names its
// deadline `endDate` and its target list `targetUnitIds`, so the server's own
// field names have to be translated before an error can be shown in place.
const pollServerFields = {
  title: 'title',
  description: 'description',
  ends_at: 'endDate',
  options: 'options',
  target_units: 'targetUnitIds',
}

function flattenMessages(value, messages = []) {
  if (typeof value === 'string') {
    const message = value.trim()
    if (message) messages.push(message)
    return messages
  }
  if (Array.isArray(value)) {
    value.forEach((item) => flattenMessages(item, messages))
    return messages
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => flattenMessages(item, messages))
  }
  return messages
}

/**
 * Splits a rejected poll request into inline field errors and one general message.
 *
 * A serializer answers per field ({ ends_at: [...] }) while the view's own
 * refusals answer as { detail: "..." }. The first kind belongs under the input
 * that caused it; the second has no field to sit under, so it stays as the
 * message shown above the submit button and in the toast.
 *
 * Anything unrecognised is kept as a general message rather than dropped — an
 * error the manager cannot see is worse than one in the wrong place.
 */
export function mapPollServerErrors(error) {
  const details = error?.details
  const fallback = error?.message || 'ثبت نظرسنجی ناموفق بود.'

  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return { fieldErrors: {}, message: fallback }
  }

  const fieldErrors = {}
  const general = []

  for (const [key, value] of Object.entries(details)) {
    const field = pollServerFields[key]
    const messages = flattenMessages(value)
    if (messages.length === 0) continue

    if (field) fieldErrors[field] = messages.join(' ')
    else general.push(...messages)
  }

  return {
    fieldErrors,
    // With every complaint placed under a field, the banner would only repeat
    // them; it says what to do instead.
    message:
      general.join(' ') ||
      (Object.keys(fieldErrors).length > 0
        ? 'برخی از فیلدهای فرم نیاز به اصلاح دارند.'
        : fallback),
  }
}
