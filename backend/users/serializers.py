from django.db.models import Q
from rest_framework import serializers

from common.constants import ValidationMessages
from .models import User, UserRole
from .validators import (
    validate_national_id_value,
    validate_password_strength,
    validate_phone_value,
    validate_username_value,
)


class AuthUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name", "username", "phone", "national_id", "role")


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name", "username", "phone", "national_id", "role", "date_joined")


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    password_confirmation = serializers.CharField(write_only=True, min_length=8, max_length=128)

    class Meta:
        model = User
        fields = ("full_name", "username", "phone", "national_id", "password", "password_confirmation")

    def validate_phone(self, value):
        return validate_phone_value(value)

    def validate_national_id(self, value):
        return validate_national_id_value(value)

    def validate_username(self, value):
        return validate_username_value(value.strip())

    def validate_password(self, value):
        return validate_password_strength(value)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirmation"]:
            raise serializers.ValidationError(
                {"password_confirmation": ValidationMessages.PASSWORD_CONFIRMATION_MISMATCH}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirmation")
        password = validated_data.pop("password")
        username = validated_data.pop("username", "") or validated_data["phone"]
        user = User(**validated_data, username=username)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        login = attrs.get("login", "").strip()
        password = attrs.get("password", "")

        if not login:
            raise serializers.ValidationError({"login": ValidationMessages.LOGIN_REQUIRED})

        user = User.objects.filter(Q(username=login) | Q(phone=login) | Q(national_id=login)).first()
        if not user or not user.check_password(password):
            raise serializers.ValidationError({"detail": ValidationMessages.LOGIN_INVALID})
        if not user.is_active:
            raise serializers.ValidationError({"detail": ValidationMessages.INACTIVE_ACCOUNT})

        attrs["user"] = user
        return attrs


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=[UserRole.RESIDENT, UserRole.MANAGER])

    class Meta:
        model = User
        fields = ("role",)

    def update(self, instance, validated_data):
        instance.role = validated_data["role"]
        instance.is_staff = instance.role == UserRole.MANAGER
        instance.save(update_fields=["role", "is_staff"])
        return instance


class AdminProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    username = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=11)
    national_id = serializers.CharField(max_length=10)
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8, max_length=128)
    new_password_confirmation = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8, max_length=128)

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(ValidationMessages.FULL_NAME_REQUIRED)
        return value

    def validate_username(self, value):
        value = validate_username_value(value.strip())
        if not value:
            raise serializers.ValidationError(ValidationMessages.USERNAME_REQUIRED)
        user = self.context["request"].user
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError(ValidationMessages.USERNAME_ALREADY_EXISTS)
        return value

    def validate_phone(self, value):
        value = validate_phone_value(value.strip())
        user = self.context["request"].user
        if User.objects.exclude(pk=user.pk).filter(phone=value).exists():
            raise serializers.ValidationError(ValidationMessages.PHONE_ALREADY_EXISTS)
        return value

    def validate_national_id(self, value):
        value = validate_national_id_value(value.strip())
        user = self.context["request"].user
        if User.objects.exclude(pk=user.pk).filter(national_id=value).exists():
            raise serializers.ValidationError(ValidationMessages.NATIONAL_ID_ALREADY_EXISTS)
        return value

    def validate_new_password(self, value):
        if value:
            return validate_password_strength(value)
        return value

    def validate(self, attrs):
        new_password = attrs.get("new_password", "")
        confirmation = attrs.get("new_password_confirmation", "")
        current_password = attrs.get("current_password", "")
        user = self.context["request"].user

        if new_password or confirmation or current_password:
            if not current_password:
                raise serializers.ValidationError(
                    {"current_password": ValidationMessages.CURRENT_PASSWORD_REQUIRED}
                )
            if not user.check_password(current_password):
                raise serializers.ValidationError(
                    {"current_password": ValidationMessages.CURRENT_PASSWORD_INVALID}
                )
            if not new_password:
                raise serializers.ValidationError({"new_password": ValidationMessages.NEW_PASSWORD_REQUIRED})
            if new_password != confirmation:
                raise serializers.ValidationError(
                    {
                        "new_password_confirmation": (
                            ValidationMessages.NEW_PASSWORD_CONFIRMATION_MISMATCH
                        )
                    }
                )

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.full_name = self.validated_data["full_name"]
        user.username = self.validated_data["username"]
        user.phone = self.validated_data["phone"]
        user.national_id = self.validated_data["national_id"]

        update_fields = ["full_name", "username", "phone", "national_id"]
        if self.validated_data.get("new_password"):
            user.set_password(self.validated_data["new_password"])
            update_fields.append("password")

        user.save(update_fields=update_fields)
        return user


class AdminPasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    new_password_confirmation = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError(ValidationMessages.CURRENT_PASSWORD_INVALID)
        return value

    def validate_new_password(self, value):
        return validate_password_strength(value)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirmation"]:
            raise serializers.ValidationError(
                {"new_password_confirmation": ValidationMessages.NEW_PASSWORD_CONFIRMATION_MISMATCH}
            )
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
