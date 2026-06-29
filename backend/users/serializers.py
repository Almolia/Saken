from django.contrib.auth import authenticate, password_validation
from rest_framework import serializers

from .models import User, UserRole


def validate_password_strength(value):
    if len(value) < 8:
        raise serializers.ValidationError('گذرواژه باید حداقل 8 کاراکتر باشد.')
    if not any(char.isalpha() and char.isascii() for char in value):
        raise serializers.ValidationError('گذرواژه باید حداقل شامل یک حرف انگلیسی باشد.')
    if not any(char.isdigit() for char in value):
        raise serializers.ValidationError('گذرواژه باید حداقل شامل یک عدد باشد.')
    password_validation.validate_password(value)
    return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    password_confirmation = serializers.CharField(write_only=True, min_length=8, max_length=128)

    class Meta:
        model = User
        fields = ('full_name', 'phone', 'national_id', 'password', 'password_confirmation')

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 11 or not value.startswith('09'):
            raise serializers.ValidationError('شماره موبایل معتبر نیست.')
        return value

    def validate_national_id(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError('کد ملی معتبر نیست.')
        return value

    def validate_password(self, value):
        return validate_password_strength(value)

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirmation']:
            raise serializers.ValidationError({'password_confirmation': 'تکرار گذرواژه با گذرواژه مطابقت ندارد.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirmation')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'full_name', 'phone', 'national_id', 'role', 'status', 'date_joined')

    def get_status(self, obj):
        return 'disabled' if obj.is_disabled or not obj.is_active else 'active'


class LoginSerializer(serializers.Serializer):
    phone = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        phone = attrs.get('phone', '').strip()
        password = attrs.get('password', '')
        user = authenticate(request=self.context.get('request'), phone=phone, password=password)
        if not user:
            raise serializers.ValidationError({'detail': 'شماره موبایل یا گذرواژه نادرست است.'})
        if user.is_disabled or not user.is_active:
            raise serializers.ValidationError({'detail': 'حساب کاربری شما غیرفعال شده است.'})
        attrs['user'] = user
        return attrs


class UserStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('is_disabled',)

    def update(self, instance, validated_data):
        instance.is_disabled = validated_data.get('is_disabled', instance.is_disabled)
        instance.is_active = not instance.is_disabled
        instance.save(update_fields=['is_disabled', 'is_active'])
        return instance


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=[UserRole.RESIDENT, UserRole.MANAGER])

    class Meta:
        model = User
        fields = ('role',)

    def update(self, instance, validated_data):
        instance.role = validated_data['role']
        instance.is_staff = instance.role == UserRole.MANAGER
        instance.save(update_fields=['role', 'is_staff'])
        return instance


class AdminPasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    new_password_confirmation = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('گذرواژه فعلی نادرست است.')
        return value

    def validate_new_password(self, value):
        return validate_password_strength(value)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirmation']:
            raise serializers.ValidationError({'new_password_confirmation': 'تکرار گذرواژه جدید با گذرواژه جدید مطابقت ندارد.'})
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class AuthUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'full_name', 'phone', 'national_id', 'role')
