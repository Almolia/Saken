from django.contrib.auth import get_user_model
from rest_framework import serializers
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