import re
from datetime import date

from rest_framework.exceptions import ValidationError


PERSIAN_DIGITS = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')


def normalize_persian_text(value):
    return re.sub(
        r'\s+',
        ' ',
        str(value or '')
        .translate(PERSIAN_DIGITS)
        .replace('\u200c', ' ')
        .replace('ي', 'ی')
        .replace('ى', 'ی')
        .replace('ك', 'ک'),
    ).strip().casefold()


def jalali_to_gregorian(jy, jm, jd):
    """Convert a validated Jalali date to ``datetime.date`` without locale/TZ assumptions."""
    jy += 1595
    days = (
        -355668
        + (365 * jy)
        + ((jy // 33) * 8)
        + (((jy % 33) + 3) // 4)
        + jd
        + (31 * (jm - 1) if jm < 7 else (30 * (jm - 7)) + 186)
    )

    gy = 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        days -= 1
        gy += 100 * (days // 36524)
        days %= 36524
        if days >= 365:
            days += 1

    gy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gy += (days - 1) // 365
        days = (days - 1) % 365

    gd = days + 1
    leap = gy % 4 == 0 and (gy % 100 != 0 or gy % 400 == 0)
    month_days = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    gm = 1
    for length in month_days:
        if gd <= length:
            break
        gd -= length
        gm += 1

    return date(gy, gm, gd)


def parse_filter_date(value, field_name):
    """Parse YYYY-MM-DD/YYY/MM/DD in Gregorian or Jalali notation."""
    normalized = normalize_persian_text(value).replace('/', '-')
    match = re.fullmatch(r'(\d{4})-(\d{1,2})-(\d{1,2})', normalized)
    if not match:
        raise ValidationError({field_name: 'تاریخ باید با قالب YYYY-MM-DD وارد شود.'})

    year, month, day = map(int, match.groups())
    try:
        if year < 1700:
            if not 1 <= month <= 12 or not 1 <= day <= 31:
                raise ValueError
            converted = jalali_to_gregorian(year, month, day)
            # Round-trip-level day limits for Jalali months.
            if (month <= 6 and day > 31) or (month >= 7 and month <= 11 and day > 30) or (month == 12 and day > 30):
                raise ValueError
            return converted
        return date(year, month, day)
    except ValueError as error:
        raise ValidationError({field_name: 'تاریخ واردشده معتبر نیست.'}) from error


def parse_api_date(value, field_name='date'):
    """Parse a date accepted by write APIs.

    Gregorian ISO dates remain valid for existing clients and stored data;
    Jalali dates (including Persian/Arabic digits) are converted before Django
    persists them in its standard Gregorian ``DateField``.
    """
    return parse_filter_date(value, field_name)


def map_status(value, aliases, field_name='status'):
    normalized = normalize_persian_text(value).replace('-', ' ')
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    mapped = aliases.get(normalized)
    if mapped is None:
        raise ValidationError({field_name: 'وضعیت واردشده معتبر نیست.'})
    return mapped
