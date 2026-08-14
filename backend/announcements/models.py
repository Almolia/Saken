from django.conf import settings
from django.db import models


class Announcement(models.Model):
    """
    Represents an announcement published by managers for residents to read.
    """
    title = models.CharField(max_length=255, verbose_name="عنوان")
    content = models.TextField(verbose_name="محتوا")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements",
        verbose_name="نویسنده",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="فعال",
        help_text="غیرفعال کردن برای مخفی کردن اطلاعیه",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="زمان بروزرسانی")

    class Meta:
        verbose_name = "اطلاعیه"
        verbose_name_plural = "اطلاعیه‌ها"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title