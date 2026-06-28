from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User, UserRole


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, max_length=6)
    password_confirmation = serializers.CharField(write_only=True, min_length=6, max_length=6)

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
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError('گذرواژه باید دقیقاً 6 رقم باشد.')
        return value

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


class AuthUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'full_name', 'phone', 'national_id', 'role')


class ManagerBootstrapSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=11)
    national_id = serializers.CharField(max_length=10)
    password = serializers.CharField(min_length=6, max_length=6)

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 11 or not value.startswith('09'):
            raise serializers.ValidationError('شماره موبایل معتبر نیست.')
        return value

    def validate_national_id(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError('کد ملی معتبر نیست.')
        return value

    def validate_password(self, value):
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError('گذرواژه باید دقیقاً 6 رقم باشد.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data, role=UserRole.MANAGER, is_staff=True)
        user.set_password(password)
        user.save()
        return user
