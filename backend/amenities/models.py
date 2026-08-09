from django.conf import settings
from django.db import models


class Amenity(models.Model):
    """
    Represents a shared amenity or facility in the building
    that residents can book or use (e.g., gym, parking, rooftop).
    """

    name = models.CharField(
        max_length=100,
        verbose_name="نام امکان",
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name="توضیحات",
    )
    operating_rules = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="قوانین و ساعات کاری",
        help_text="مثلاً: 08:00 تا 22:00",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="فعال",
        help_text="غیرفعال کردن برای تعمیرات یا نگهداری",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "امکان"
        verbose_name_plural = "امکانات"
        ordering = ["name"]

    def __str__(self):
        status = "" if self.is_active else " (غیرفعال)"
        return f"{self.name}{status}"


class ReservationStatus(models.TextChoices):
    ACTIVE = "Active", "Active"
    CANCELED = "Canceled", "Canceled"


class Reservation(models.Model):
    """
    Represents a booking made by a resident for a shared amenity during a specific time range.
    """

    amenity = models.ForeignKey(
        Amenity,
        on_delete=models.CASCADE,
        related_name="reservations",
        verbose_name="امکان",
    )
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reservations",
        verbose_name="ساکن",
    )
    start_time = models.DateTimeField(verbose_name="زمان شروع")
    end_time = models.DateTimeField(verbose_name="زمان پایان")
    status = models.CharField(
        max_length=20,
        choices=ReservationStatus.choices,
        default=ReservationStatus.ACTIVE,
        verbose_name="وضعیت",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "رزرو"
        verbose_name_plural = "رزروها"
        ordering = ["-start_time", "-id"]

    def __str__(self):
        return f"{self.amenity.name} - {self.resident.full_name} ({self.start_time} - {self.end_time})"
