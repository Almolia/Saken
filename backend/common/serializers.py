from rest_framework import serializers

from .filter_utils import parse_api_date


class JalaliCompatibleDateField(serializers.DateField):
    """Accept Jalali or Gregorian date input while retaining Gregorian ISO API output.

    Database dates and legacy API consumers therefore remain stable; Persian UI
    clients can submit a Jalali calendar value without a separate migration.
    """

    def to_internal_value(self, value):
        if isinstance(value, str):
            return parse_api_date(value, self.field_name or 'date')
        return super().to_internal_value(value)
