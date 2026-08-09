from datetime import datetime, time
from django.utils import timezone
from rest_framework import serializers

from common.constants import AmenityMessages
from .models import Amenity, Reservation, ReservationStatus


def check_booking_conflict(amenity_id, start_time, end_time, exclude_reservation_id=None):
    """
    Checks if any existing Active reservation for the given amenity
    overlaps with the requested time range.
    The overlap logic verifies: (existing_start < requested_end) AND (existing_end > requested_start).
    If an overlap exists, raises a serializers.ValidationError.
    """
    if start_time >= end_time:
        raise serializers.ValidationError("زمان پایان باید بعد از زمان شروع باشد.")

    queryset = Reservation.objects.filter(
        amenity_id=amenity_id,
        status=ReservationStatus.ACTIVE,
        start_time__lt=end_time,
        end_time__gt=start_time,
    )
    if exclude_reservation_id:
        queryset = queryset.exclude(pk=exclude_reservation_id)

    if queryset.exists():
        raise serializers.ValidationError(AmenityMessages.SLOT_ALREADY_BOOKED)


def create_reservation(resident, amenity_id, start_time, end_time):
    """
    Creates a new booking for a resident after checking conflict resolution.
    """
    try:
        amenity = Amenity.objects.get(pk=amenity_id)
    except Amenity.DoesNotExist:
        raise serializers.ValidationError(AmenityMessages.AMENITY_NOT_FOUND)

    if not amenity.is_active:
        raise serializers.ValidationError(AmenityMessages.AMENITY_NOT_ACTIVE)

    check_booking_conflict(amenity.id, start_time, end_time)

    reservation = Reservation.objects.create(
        amenity=amenity,
        resident=resident,
        start_time=start_time,
        end_time=end_time,
        status=ReservationStatus.ACTIVE,
    )
    return reservation


def cancel_reservation(reservation_id, user=None):
    """
    Cancels an existing booking.
    """
    try:
        reservation = Reservation.objects.get(pk=reservation_id)
    except Reservation.DoesNotExist:
        raise serializers.ValidationError(AmenityMessages.RESERVATION_NOT_FOUND)

    if user and getattr(user, "role", None) == "resident" and reservation.resident_id != user.id:
        raise serializers.ValidationError("شما اجازه دسترسی به این رزرو را ندارید.")

    if reservation.status == ReservationStatus.CANCELED:
        return reservation

    reservation.status = ReservationStatus.CANCELED
    reservation.save(update_fields=["status", "updated_at"])
    return reservation

def cancel_reservation_with_validation(reservation, user):
    """
    Cancels a reservation with validation:
    - Resident must own the reservation
    - Reservation must be in the future (start_time > now)
    - Reservation must not already be canceled
    """
    # Check ownership
    if user and getattr(user, "role", None) == "resident" and reservation.resident_id != user.id:
        raise serializers.ValidationError("شما اجازه دسترسی به این رزرو را ندارید.")

    # Check if already canceled
    if reservation.status == ReservationStatus.CANCELED:
        raise serializers.ValidationError("این رزرو قبلاً لغو شده است.")

    # Check if reservation is in the future
    now = timezone.now()
    if reservation.start_time <= now:
        raise serializers.ValidationError("امکان لغو رزروهای گذشته وجود ندارد.")

    reservation.status = ReservationStatus.CANCELED
    reservation.save(update_fields=["status", "updated_at"])
    return reservation


def get_amenity_slots(amenity, target_date):
    """
    Returns available and unavailable hourly slots for a specific amenity on a specific day (date object).
    """
    tz = timezone.get_current_timezone()
    day_start = timezone.make_aware(datetime.combine(target_date, time.min), tz)
    day_end = timezone.make_aware(datetime.combine(target_date, time.max), tz)

    reservations = Reservation.objects.filter(
        amenity_id=amenity.id,
        status=ReservationStatus.ACTIVE,
        start_time__lt=day_end,
        end_time__gt=day_start,
    ).order_by("start_time", "id")

    slots = []
    for hour in range(8, 22):
        slot_start = timezone.make_aware(datetime.combine(target_date, time(hour, 0)), tz)
        slot_end = timezone.make_aware(datetime.combine(target_date, time(hour + 1, 0)), tz)

        is_booked = any(
            res.start_time < slot_end and res.end_time > slot_start
            for res in reservations
        )

        slots.append({
            "start_time": slot_start.isoformat(),
            "end_time": slot_end.isoformat(),
            "start_time_formatted": f"{hour:02d}:00",
            "end_time_formatted": f"{hour + 1:02d}:00",
            "label": f"{hour:02d}:00 تا {hour + 1:02d}:00",
            "is_booked": is_booked,
            "is_available": not is_booked,
        })

    booked_slots = [
        {
            "start_time": slot["start_time"],
            "end_time": slot["end_time"],
        }
        for slot in slots
        if slot["is_booked"]
    ]

    return {
        "date": target_date.isoformat(),
        "amenity_id": amenity.id,
        "amenity_name": amenity.name,
        "reservations": [
            {
                "id": res.id,
                "start_time": res.start_time.isoformat(),
                "end_time": res.end_time.isoformat(),
                "status": res.status,
                "resident": res.resident_id,
            }
            for res in reservations
        ],
        "slots": slots,
        "unavailable_slots": booked_slots,
        "booked_slots": booked_slots,
    }