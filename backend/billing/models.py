from decimal import Decimal
from django.conf import settings
from django.db import models
from buildings.models import Unit


class PeriodicCharge(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()
    apply_to_all = models.BooleanField(default=True)
    units = models.ManyToManyField(Unit, blank=True, related_name="periodic_charges")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_charges",
    )

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.title} - {self.amount}"
