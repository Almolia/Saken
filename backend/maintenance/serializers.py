from rest_framework import serializers
from .models import ServiceRequest

class ServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ['id', 'title', 'description', 'status', 'resident', 'assigned_staff', 'work_report']
        read_only_fields = ['resident', 'status', 'assigned_staff', 'work_report']