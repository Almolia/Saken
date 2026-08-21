from django.conf import settings
from django.db import models


class PollStatus(models.TextChoices):
    DRAFT = "Draft", "پیش‌نویس"
    ACTIVE = "Active", "فعال"
    CLOSED = "Closed", "بسته‌شده"


class Poll(models.Model):
    """
    Represents a poll or survey published by managers for residents to vote on.
    """
    title = models.CharField(max_length=255, verbose_name="عنوان")
    description = models.TextField(blank=True, default="", verbose_name="توضیحات")
    status = models.CharField(
        max_length=20,
        choices=PollStatus.choices,
        default=PollStatus.DRAFT,
        verbose_name="وضعیت",
    )
    starts_at = models.DateTimeField(null=True, blank=True, verbose_name="زمان شروع")
    ends_at = models.DateTimeField(verbose_name="زمان پایان")
    target_units = models.ManyToManyField(
        "buildings.Unit",
        blank=True,
        related_name="polls",
        verbose_name="واحدهای هدف",
        help_text="اگر خالی باشد، همه واحدها هدف هستند.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_polls",
        verbose_name="ایجادکننده",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="زمان بروزرسانی")

    class Meta:
        verbose_name = "نظرسنجی"
        verbose_name_plural = "نظرسنجی‌ها"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.title


class PollOption(models.Model):
    """
    Represents a single option within a poll.
    """
    poll = models.ForeignKey(
        Poll,
        on_delete=models.CASCADE,
        related_name="options",
        verbose_name="نظرسنجی",
    )
    text = models.CharField(max_length=255, verbose_name="متن گزینه")
    position = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="ترتیب نمایش",
        help_text="عدد کوچک‌تر، بالاتر نشان داده می‌شود.",
    )

    class Meta:
        verbose_name = "گزینه نظرسنجی"
        verbose_name_plural = "گزینه‌های نظرسنجی"
        ordering = ["position", "id"]

    def __str__(self):
        return f"{self.poll.title} - {self.text}"


class Vote(models.Model):
    poll = models.ForeignKey(
        Poll,
        on_delete=models.CASCADE,
        related_name="votes",
        verbose_name="نظرسنجی",
    )
    option = models.ForeignKey(
        PollOption,
        on_delete=models.CASCADE,
        related_name="votes",
        verbose_name="گزینه",
    )
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="votes",
        verbose_name="ساکن",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت رأی")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["poll", "resident"],
                name="unique_vote_per_resident_per_poll",
            ),
        ]
        verbose_name = "رأی"
        verbose_name_plural = "رأی‌ها"

    def __str__(self):
        return f"{self.resident} - {self.poll.title} - {self.option.text}"
