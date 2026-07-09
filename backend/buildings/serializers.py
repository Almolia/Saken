from django.contrib.auth import get_user_model
from rest_framework import serializers
from common.constants import UnitMessages
from .models import Unit

User = get_user_model()

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['id', 'unit_number', 'floor', 'area', 'building', 'details']

class UnitOwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'username', 'phone']

class ManagerUnitSerializer(serializers.ModelSerializer):
    owner = UnitOwnerSerializer(read_only=True)

    class Meta:
        model = Unit
        fields = ['id', 'unit_number', 'floor', 'area', 'building', 'details', 'owner']

class UnitAssignSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='owner',
        allow_null=True,
        error_messages={
            'does_not_exist': UnitMessages.USER_NOT_FOUND,
            'incorrect_type': UnitMessages.USER_NOT_FOUND,
        },
    )

    class Meta:
        model = Unit
        fields = ['user_id']