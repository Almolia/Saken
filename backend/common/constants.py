class UserMessages:
    REGISTER_SUCCESS = "ثبت‌نام با موفقیت انجام شد."
    LOGIN_SUCCESS = "ورود با موفقیت انجام شد."
    LOGOUT_SUCCESS = "خروج با موفقیت انجام شد."
    INACTIVE_ACCOUNT = "حساب کاربری شما فعال نیست."
    ADMIN_ONLY_ROLE_CHANGE = "فقط ادمین می‌تواند نقش کاربران را تغییر دهد."
    ADMIN_ROLE_IMMUTABLE = "نقش ادمین قابل تغییر نیست."
    SELF_ROLE_IMMUTABLE = "امکان تغییر نقش حساب جاری وجود ندارد."
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
    UNIT_ASSIGNED = "واحد با موفقیت به کاربر اختصاص یافت."
    UNIT_UNASSIGNED = "واحد با موفقیت تخلیه شد."
    UNIT_DELETED = "واحد با موفقیت حذف شد."
    UNIT_NOT_FOUND = "واحد مورد نظر یافت نشد."
    USER_NOT_FOUND = "کاربر مورد نظر یافت نشد."


class ManagerMessages:
    PHONE_REQUIRED = "شماره موبایل الزامی است."
    SUPERUSER_STAFF_REQUIRED = "Superuser must have is_staff=True."
    SUPERUSER_SUPERUSER_REQUIRED = "Superuser must have is_superuser=True."


class ServiceRequestMessages:
    REQUEST_ASSIGNED = "درخواست خدمات با موفقیت ارجاع شد."
    REQUEST_REASSIGNED = "مسئول درخواست با موفقیت تغییر کرد."
    REQUEST_NOT_FOUND = "درخواست خدمات مورد نظر یافت نشد."
    COMPLETED_REQUEST_NOT_ASSIGNABLE = "درخواست‌های تکمیل‌شده قابل ارجاع مجدد نیستند."
    STAFF_NOT_FOUND = "کاربر ارجاعی یافت نشد."
    STAFF_INVALID_ROLE = "کاربر انتخابی جزو کارکنان خدمات نیست."
    ASSIGNED_STAFF_REQUIRED = "انتخاب کارکنان خدمات الزامی است."


class SettlementMessages:
    SETTLEMENT_SUCCESS = "تسویه هزینه با موفقیت انجام شد."
    COST_MUST_BE_POSITIVE = "مبلغ هزینه باید بزرگ‌تر از صفر باشد."
    INVALID_PAYMENT_METHOD = "روش پرداخت انتخاب‌شده معتبر نیست."
    REQUEST_NOT_COMPLETED = "فقط درخواست‌های تکمیل‌شده قابل تسویه هستند."
    ALREADY_SETTLED = "هزینه این درخواست قبلاً تسویه شده است."
    NO_UNITS_TO_SPLIT = "هیچ واحدی برای تقسیم هزینه ثبت نشده است."
    REQUESTER_HAS_NO_UNIT = "برای ثبت‌کننده این درخواست واحدی ثبت نشده است."
    BUILDING_NOT_RESOLVED = "ساختمان مربوط به این درخواست مشخص نیست."
    INSUFFICIENT_WALLET_BALANCE = "موجودی صندوق ساختمان برای پرداخت این هزینه کافی نیست."


class PaymentMessages:
    PAYMENT_SUCCESS = "پرداخت با موفقیت انجام شد."
    INVALID_CHARGE_IDS = "برخی از شارژهای انتخاب‌شده وجود ندارند."
    CHARGE_NOT_OWNED = "برخی از شارژهای انتخاب‌شده متعلق به شما نیستند."
    CHARGE_ALREADY_PAID = "برخی از شارژهای انتخاب‌شده قبلاً پرداخت شده‌اند."
    DUPLICATE_CHARGE_IDS = "هر شارژ تنها یک بار می‌تواند در فهرست پرداخت باشد."
    BUILDING_NOT_RESOLVED = (
        "ساختمان مربوط به برخی از شارژهای انتخاب‌شده مشخص نیست؛ "
        "لطفاً با مدیر ساختمان تماس بگیرید."
    )


class ChargeMessages:
    CHARGE_NOT_FOUND = "شارژ مورد نظر یافت نشد."
    CHARGE_UPDATED = "شارژ با موفقیت به‌روزرسانی شد."
    CHARGE_DELETED = "شارژ با موفقیت حذف شد."
    TITLE_REQUIRED = "عنوان شارژ الزامی است."
    DUE_DATE_REQUIRED = "مهلت پرداخت الزامی است."
    AMOUNT_MUST_BE_POSITIVE = "مبلغ شارژ باید بزرگ‌تر از صفر باشد."
    NO_FIELDS_TO_UPDATE = "هیچ فیلدی برای به‌روزرسانی ارسال نشده است."
    AMOUNT_LOCKED_AFTER_PAYMENT = (
        "مبلغ این شارژ قابل تغییر نیست، چون بخشی از آن پرداخت شده است."
    )
    DELETE_LOCKED_AFTER_PAYMENT = (
        "این شارژ قابل حذف نیست، چون بخشی از آن پرداخت شده است."
    )


class AmenityMessages:
    AMENITY_CREATED = "امکان با موفقیت ایجاد شد."
    AMENITY_UPDATED = "امکان با موفقیت به‌روزرسانی شد."
    AMENITY_DELETED = "امکان با موفقیت حذف شد."
    AMENITY_NOT_FOUND = "امکان مورد نظر یافت نشد."
