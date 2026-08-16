from common.constants import ValidationMessages
from rest_framework import serializers


def validate_announcement_title(value):
    value = value.strip()
    if not value:
        raise serializers.ValidationError(ValidationMessages.ANNOUNCEMENT_TITLE_REQUIRED)
    return value


def validate_announcement_content(value):
    value = value.strip()
    if not value:
        raise serializers.ValidationError(ValidationMessages.ANNOUNCEMENT_CONTENT_REQUIRED)
    return value
