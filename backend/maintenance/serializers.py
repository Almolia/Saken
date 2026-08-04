from rest_framework import serializers
from .models import ServiceRequest
from users.models import UserRole


class NestedUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)


class ServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ['id', 'title', 'description', 'status', 'resident', 'assigned_staff', 'work_report']
        read_only_fields = ['resident', 'status', 'assigned_staff', 'work_report']


class ManagerServiceRequestSerializer(serializers.ModelSerializer):
    resident = NestedUserSerializer(read_only=True)
    assigned_staff = NestedUserSerializer(read_only=True)

    class Meta:
        model = ServiceRequest
        fields = [
            'id',
            'title',
            'description',
            'status',
            'resident',
            'assigned_staff',
            'work_report',
        ]
        read_only_fields = fields


class AssignServiceRequestSerializer(serializers.Serializer):
    staff_id = serializers.IntegerField()

    def validate_staff_id(self, value):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        if value is None:
            raise serializers.ValidationError("انتخاب کارکنان خدمات الزامی است.")

        try:
            user = User.objects.get(pk=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("کاربر ارجاعی یافت نشد.")

        if user.role != UserRole.SERVICE_STAFF:
            raise serializers.ValidationError("کاربر انتخابی جزو کارکنان خدمات نیست.")

        return value

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
        """Staff need to know which unit to visit; the unit hangs off the resident."""
        if not obj.resident_id:
            return None
        # Sorted in Python so the prefetched units cache is reused.
        units = sorted(obj.resident.units.all(), key=lambda unit: unit.unit_number)
        return units[0].unit_number if units else None