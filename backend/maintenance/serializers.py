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

    assigned_staff_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID of the service staff member to assign to this request"
    )

    class Meta:
        model = ServiceRequest
        fields = ['title', 'description', 'work_report', 'assigned_staff_id', 'status']
        read_only_fields = ['status']

    def validate_assigned_staff_id(self, value):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        if value is None:
            return value

        try:
            user = User.objects.get(pk=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found or inactive.")

        if user.role != UserRole.SERVICE_STAFF:
            raise serializers.ValidationError(
                "Only users with service staff role can be assigned to requests."
            )

        # Store the user instance for later use
        self._assigned_staff_user = user
        return value

    def validate(self, attrs):
        from .models import RequestStatus

        # Get the user instance from the validated data
        assigned_staff_id = attrs.get('assigned_staff_id')

        if assigned_staff_id is not None:
            # Retrieve the user from validation
            assigned_staff = getattr(self, '_assigned_staff_user', None)
            if assigned_staff:
                attrs['assigned_staff'] = assigned_staff

            instance = self.instance
            if instance and instance.status != RequestStatus.PENDING:
                raise serializers.ValidationError({
                    'assigned_staff_id': "Only pending requests can be assigned."
                })
            attrs['status'] = RequestStatus.ASSIGNED

        return attrs

    def update(self, instance, validated_data):
        from .models import RequestStatus

        # Remove assigned_staff_id from validated_data
        validated_data.pop('assigned_staff_id', None)

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
