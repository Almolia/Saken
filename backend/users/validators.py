from django.contrib.auth import password_validation
from rest_framework import serializers

from common.constants import ValidationMessages


def validate_password_strength(value):
    if len(value) < 8:
        raise serializers.ValidationError(ValidationMessages.PASSWORD_MIN_LENGTH)
    if not any(char.isalpha() and char.isascii() for char in value):
        raise serializers.ValidationError(ValidationMessages.PASSWORD_NEEDS_LETTER)
    if not any(char.isdigit() for char in value):
        raise serializers.ValidationError(ValidationMessages.PASSWORD_NEEDS_DIGIT)
    password_validation.validate_password(value)
    return value


def validate_username_value(value):
    if not value:
        return value
    if len(value) < 3:
        raise serializers.ValidationError(ValidationMessages.USERNAME_MIN_LENGTH)
    if not value.replace("_", "").replace("-", "").isalnum():
        raise serializers.ValidationError(ValidationMessages.USERNAME_INVALID)
    return value


def validate_phone_value(value):
    if not value.isdigit() or len(value) != 11 or not value.startswith("09"):
        raise serializers.ValidationError(ValidationMessages.PHONE_INVALID)
    return value


def validate_national_id_value(value):
    if not value.isdigit() or len(value) != 10:
        raise serializers.ValidationError(ValidationMessages.NATIONAL_ID_INVALID)
    return value
