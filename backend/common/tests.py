from datetime import date

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from .filter_utils import parse_api_date


class JalaliDateInputTests(SimpleTestCase):
    def test_accepts_jalali_dates_with_persian_digits(self):
        self.assertEqual(parse_api_date('۱۴۰۵/۰۱/۰۱'), date(2026, 3, 21))

    def test_keeps_existing_gregorian_dates_compatible(self):
        self.assertEqual(parse_api_date('2026-03-21'), date(2026, 3, 21))

    def test_rejects_invalid_jalali_date(self):
        with self.assertRaises(ValidationError):
            parse_api_date('1405-12-31')
