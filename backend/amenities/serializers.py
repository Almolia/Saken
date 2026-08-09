from rest_framework import serializers
from .models import Amenity


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ["id", "name", "description", "operating_rules", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class AmenityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ["name", "description", "operating_rules", "is_active"]

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("نام امکان الزامی است.")
        return value.strip()


class AmenityUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ["name", "description", "operating_rules", "is_active"]

    def validate_name(self, value):
        if value is not None and not value.strip():
            raise serializers.ValidationError("نام امکان نمی‌تواند خالی باشد.")
        return value.strip() if value else value
