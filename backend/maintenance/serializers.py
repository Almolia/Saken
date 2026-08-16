from decimal import Decimal

from common.constants import ServiceRequestMessages, SettlementMessages
from django.contrib.auth import get_user_model
from rest_framework import serializers
from users.models import UserRole

from .models import PaymentMethod, ServiceRequest, RequestStatus

User = get_user_model()

NON_ASSIGNABLE_ROLES = {
    UserRole.RESIDENT,
    UserRole.MANAGER,
    UserRole.ADMIN,
}


class NestedUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)


class ServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ['id', 'title', 'description', 'status', 'resident', 'assigned_staff', 'work_report', 'created_at']
        read_only_fields = ['resident', 'status', 'assigned_staff', 'work_report', 'created_at']


class ManagerServiceRequestSerializer(serializers.ModelSerializer):
    resident = NestedUserSerializer(read_only=True)
    assigned_staff = NestedUserSerializer(read_only=True)
    unit_number = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            'id',
            'title',
            'description',
            'status',
            'resident',
            'unit_number',
            'assigned_staff',
            'work_report',
            'cost',
            'payment_method',
            'is_settled',
            'created_at',
        ]
        read_only_fields = fields

    def get_unit_number(self, obj):
        if not obj.resident_id:
            return None
        units = sorted(obj.resident.units.all(), key=lambda unit: unit.unit_number)
        return units[0].unit_number if units else None


class ManagerServiceRequestFilterSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=RequestStatus.choices,
        required=False,
        error_messages={
            "invalid_choice": ServiceRequestMessages.INVALID_STATUS,
        },
    )


class SettleServiceRequestSerializer(serializers.Serializer):
    cost = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.01'),
        error_messages={'min_value': SettlementMessages.COST_MUST_BE_POSITIVE},
    )
    payment_method = serializers.ChoiceField(
        choices=PaymentMethod.choices,
        error_messages={'invalid_choice': SettlementMessages.INVALID_PAYMENT_METHOD},
    )


class AssignServiceRequestSerializer(serializers.Serializer):
    assigned_staff_id = serializers.IntegerField(required=False)
    staff_id = serializers.IntegerField(required=False)

    def validate(self, attrs):
        staff_id = attrs.get('assigned_staff_id')
        if staff_id is None:
            staff_id = attrs.get('staff_id')

        if staff_id is None:
            raise serializers.ValidationError({
                'assigned_staff_id': ServiceRequestMessages.ASSIGNED_STAFF_REQUIRED,
            })

        try:
            user = User.objects.get(pk=staff_id, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'assigned_staff_id': ServiceRequestMessages.STAFF_NOT_FOUND,
            })

        if user.role in NON_ASSIGNABLE_ROLES:
            raise serializers.ValidationError({
                'assigned_staff_id': ServiceRequestMessages.STAFF_INVALID_ROLE,
            })

        if user.role != UserRole.SERVICE_STAFF:
            raise serializers.ValidationError({
                'assigned_staff_id': ServiceRequestMessages.STAFF_INVALID_ROLE,
            })

        attrs['assigned_staff'] = user
        attrs['assigned_staff_id'] = staff_id
        return attrs


class StaffServiceRequestSerializer(serializers.ModelSerializer):
    resident = NestedUserSerializer(read_only=True)
    unit_number = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            'id',
            'title',
            'description',
            'status',
            'resident',
            'unit_number',
            'assigned_staff',
            'work_report',
        ]
        read_only_fields = ['id', 'title', 'description', 'resident', 'unit_number', 'assigned_staff']

    def get_unit_number(self, obj):
        if not obj.resident_id:
            return None
        units = sorted(obj.resident.units.all(), key=lambda unit: unit.unit_number)
        return units[0].unit_number if units else None
