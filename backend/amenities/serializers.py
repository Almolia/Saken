from django.utils import timezone
from rest_framework import serializers

from common.constants import AmenityMessages
from .models import Amenity, Reservation, ReservationStatus



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


class ReservationSerializer(serializers.ModelSerializer):
    amenity_name = serializers.CharField(source="amenity.name", read_only=True)
    resident_name = serializers.CharField(source="resident.full_name", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "amenity",
            "amenity_name",
            "resident",
            "resident_name",
            "start_time",
            "end_time",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReservationCreateSerializer(serializers.Serializer):
    amenity_id = serializers.IntegerField(required=False)
    amenity = serializers.PrimaryKeyRelatedField(
        queryset=Amenity.objects.all(), required=False
    )
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()

    def validate(self, attrs):
        amenity = attrs.get("amenity")
        amenity_id = attrs.get("amenity_id")

        if not amenity and amenity_id is not None:
            try:
                amenity = Amenity.objects.get(pk=amenity_id)
            except Amenity.DoesNotExist:
                raise serializers.ValidationError({"amenity": "امکان مورد نظر یافت نشد."})
            attrs["amenity"] = amenity
        elif not amenity and amenity_id is None:
            raise serializers.ValidationError({"amenity": "انتخاب امکان الزامی است."})

        if not attrs["amenity"].is_active:
            raise serializers.ValidationError({"amenity": "امکان مورد نظر در حال حاضر فعال نیست."})

        if attrs["start_time"] >= attrs["end_time"]:
            raise serializers.ValidationError("زمان پایان باید بعد از زمان شروع باشد.")

        if attrs["start_time"] <= timezone.now():
            raise serializers.ValidationError(AmenityMessages.PAST_RESERVATION_NOT_ALLOWED)

        return attrs


class ReservationUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating a reservation (specifically for cancellation).

    Only field-level shape validation lives here. The cancellation business
    rules (ownership, not already canceled, must be future-dated) are owned by
    `amenities.services.cancel_reservation`, the single implementation shared
    by the PATCH and DELETE paths, so the two endpoints can never disagree.
    """
    status = serializers.CharField(required=False)

    def validate_status(self, value):
        if value and value != ReservationStatus.CANCELED:
            raise serializers.ValidationError(
                AmenityMessages.ONLY_CANCELLATION_ALLOWED
            )
        return value