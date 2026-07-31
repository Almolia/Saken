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


class ManagerServiceRequestUpdateSerializer(serializers.ModelSerializer):
    """Serializer for managers to update service requests with validation."""

    assigned_staff_id = serializers.PrimaryKeyRelatedField(
        source='assigned_staff',
        queryset=None,
        required=False,
        allow_null=True,
        help_text="ID of the service staff member to assign to this request"
    )

    class Meta:
        model = ServiceRequest
        fields = ['title', 'description', 'work_report', 'assigned_staff_id', 'status']
        read_only_fields = ['status']  # Status is managed by the system

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.fields['assigned_staff_id'].queryset = User.objects.filter(
            is_active=True,
            role=UserRole.SERVICE_STAFF
        )

    def validate_assigned_staff_id(self, value):
        """
        Validate that the assigned user has the service_staff role.
        This validation runs automatically if the field is provided.
        """
        if value is None:
            return value

        if value.role != UserRole.SERVICE_STAFF:
            raise serializers.ValidationError(
                "Only users with service staff role can be assigned to requests."
            )
        return value

    def validate(self, attrs):
        """
        Additional cross-field validation.
        If assigned_staff is provided, update status to ASSIGNED.
        """
        from .models import RequestStatus

        assigned_staff = attrs.get('assigned_staff')

        if assigned_staff is not None:
            instance = self.instance
            if instance and instance.status != RequestStatus.PENDING:
                raise serializers.ValidationError({
                    'assigned_staff_id': "Only pending requests can be assigned."
                })
            attrs['status'] = RequestStatus.ASSIGNED

        return attrs

    def update(self, instance, validated_data):
        """Update the request and handle status changes."""
        from .models import RequestStatus

        assigned_staff = validated_data.get('assigned_staff')

        if assigned_staff is not None:
            validated_data['status'] = RequestStatus.ASSIGNED

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


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
