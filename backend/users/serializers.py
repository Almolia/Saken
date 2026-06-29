from django.contrib.auth import password_validation
from django.db.models import Q
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


def validate_username_value(value):
    if not value:
        return value
    if len(value) < 3:
        raise serializers.ValidationError('نام کاربری باید حداقل 3 کاراکتر باشد.')
    if not value.replace('_', '').replace('-', '').isalnum():
        raise serializers.ValidationError('نام کاربری فقط می‌تواند شامل حروف، عدد، خط تیره و زیرخط باشد.')
    return value


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    password_confirmation = serializers.CharField(write_only=True, min_length=8, max_length=128)

    class Meta:
        model = User
        fields = ('full_name', 'username', 'phone', 'national_id', 'password', 'password_confirmation')

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 11 or not value.startswith('09'):
            raise serializers.ValidationError('شماره موبایل معتبر نیست.')
        return value

    def validate_national_id(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError('کد ملی معتبر نیست.')
        return value

    def validate_username(self, value):
        value = value.strip()
        return validate_username_value(value)

    def validate_password(self, value):
        return validate_password_strength(value)

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirmation']:
            raise serializers.ValidationError({'password_confirmation': 'تکرار گذرواژه با گذرواژه مطابقت ندارد.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirmation')
        password = validated_data.pop('password')
        username = validated_data.pop('username', '') or validated_data['phone']
        user = User(**validated_data, username=username)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'full_name', 'username', 'phone', 'national_id', 'role', 'date_joined')


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        login = attrs.get('login', '').strip()
        password = attrs.get('password', '')

        if not login:
            raise serializers.ValidationError({'login': 'نام کاربری، شماره موبایل یا کد ملی الزامی است.'})

        user = User.objects.filter(Q(username=login) | Q(phone=login) | Q(national_id=login)).first()
        if not user or not user.check_password(password):
            raise serializers.ValidationError({'detail': 'اطلاعات ورود یا گذرواژه نادرست است.'})
        if not user.is_active:
            raise serializers.ValidationError({'detail': 'حساب کاربری شما فعال نیست.'})

        attrs['user'] = user
        return attrs


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
        fields = ('id', 'full_name', 'username', 'phone', 'national_id', 'role')
