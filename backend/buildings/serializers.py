from django.contrib.auth import get_user_model
from rest_framework import serializers
from common.constants import BuildingMessages, UnitMessages
from .models import Unit, Building

User = get_user_model()

class UnitSerializer(serializers.ModelSerializer):
    # Outstanding charges for this unit. Read-only on purpose: a resident must
    # never be able to alter their own balance via PUT/PATCH.
    unit_debt = serializers.DecimalField(
        source='debt',
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = Unit
        fields = ['id', 'unit_number', 'floor', 'area', 'details', 'unit_debt']

class UnitOwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'username', 'phone']

class ManagerUnitSerializer(serializers.ModelSerializer):
    owner = UnitOwnerSerializer(read_only=True)

    class Meta:
        model = Unit
        fields = ['id', 'unit_number', 'floor', 'area', 'details', 'owner', 'occupancy_status']

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

class ManagerBuildingSerializer(serializers.ModelSerializer):
    total_units = serializers.SerializerMethodField()

    class Meta:
        model = Building
        fields = ['id', 'name', 'building_wallet_balance', 'total_units']
        read_only_fields = ['id', 'total_units']

    def get_total_units(self, obj):
        # Every unit belongs to the one building this app manages, so the total
        # is simply how many units exist. It used to be counted through a
        # `building` foreign key on Unit, which the unit form never filled in —
        # so a building with dozens of units still reported zero.
        return Unit.objects.count()

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(BuildingMessages.NAME_REQUIRED)
        return value.strip()

    def validate_building_wallet_balance(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(BuildingMessages.WALLET_BALANCE_NEGATIVE)
        return value


class ManagerUnitUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['unit_number', 'floor', 'area', 'details', 'owner', 'occupancy_status']
        extra_kwargs = {
            'owner': {'allow_null': True, 'required': False}
        }