class UserMessages:
    REGISTER_SUCCESS = "ثبت‌نام با موفقیت انجام شد."
    LOGIN_SUCCESS = "ورود با موفقیت انجام شد."
    LOGOUT_SUCCESS = "خروج با موفقیت انجام شد."
    INACTIVE_ACCOUNT = "حساب کاربری شما فعال نیست."
    ADMIN_ONLY_ROLE_CHANGE = "فقط ادمین می‌تواند نقش کاربران را تغییر دهد."
    ADMIN_ROLE_IMMUTABLE = "نقش ادمین قابل تغییر نیست."
    ROLE_UPDATED = "نقش کاربر با موفقیت به‌روزرسانی شد."
    ADMIN_ONLY_PROFILE_UPDATE = "فقط ادمین می‌تواند تنظیمات ادمین را ویرایش کند."
    ADMIN_PROFILE_UPDATED = "اطلاعات حساب با موفقیت ذخیره شد."
    ADMIN_ONLY_PASSWORD_CHANGE = "فقط ادمین می‌تواند گذرواژه ادمین را تغییر دهد."
    ADMIN_PASSWORD_CHANGED = "گذرواژه ادمین با موفقیت تغییر کرد."


class ValidationMessages:
    PASSWORD_MIN_LENGTH = "گذرواژه باید حداقل 8 کاراکتر باشد."
    PASSWORD_NEEDS_LETTER = "گذرواژه باید حداقل شامل یک حرف انگلیسی باشد."
    PASSWORD_NEEDS_DIGIT = "گذرواژه باید حداقل شامل یک عدد باشد."
    USERNAME_MIN_LENGTH = "نام کاربری باید حداقل 3 کاراکتر باشد."
    USERNAME_INVALID = "نام کاربری فقط می‌تواند شامل حروف، عدد، خط تیره و زیرخط باشد."
    PHONE_INVALID = "شماره موبایل معتبر نیست."
    NATIONAL_ID_INVALID = "کد ملی معتبر نیست."
    PASSWORD_CONFIRMATION_MISMATCH = "تکرار گذرواژه با گذرواژه مطابقت ندارد."
    LOGIN_REQUIRED = "نام کاربری، شماره موبایل یا کد ملی الزامی است."
    LOGIN_INVALID = "اطلاعات ورود یا گذرواژه نادرست است."
    FULL_NAME_REQUIRED = "نام و نام خانوادگی الزامی است."
    USERNAME_REQUIRED = "نام کاربری الزامی است."
    USERNAME_ALREADY_EXISTS = "این نام کاربری قبلاً ثبت شده است."
    PHONE_ALREADY_EXISTS = "این شماره موبایل قبلاً ثبت شده است."
    NATIONAL_ID_ALREADY_EXISTS = "این کد ملی قبلاً ثبت شده است."
    CURRENT_PASSWORD_REQUIRED = "برای تغییر گذرواژه، رمز فعلی الزامی است."
    CURRENT_PASSWORD_INVALID = "گذرواژه فعلی نادرست است."
    NEW_PASSWORD_REQUIRED = "رمز جدید الزامی است."
    NEW_PASSWORD_CONFIRMATION_MISMATCH = "تکرار رمز جدید با رمز جدید مطابقت ندارد."


class UnitMessages:
    UNIT_CREATED = "واحد با موفقیت ایجاد شد."


class ManagerMessages:
    PHONE_REQUIRED = "شماره موبایل الزامی است."
    SUPERUSER_STAFF_REQUIRED = "Superuser must have is_staff=True."
    SUPERUSER_SUPERUSER_REQUIRED = "Superuser must have is_superuser=True."
