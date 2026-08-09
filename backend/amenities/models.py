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
