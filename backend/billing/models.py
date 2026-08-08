from decimal import Decimal
from django.conf import settings
from django.db import models
from buildings.models import Unit


class MasterCharge(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    amount_per_unit = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()
    apply_to_all = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_master_charges",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    @property
    def amount(self):
        return self.amount_per_unit

    @amount.setter
    def amount(self, value):
        self.amount_per_unit = value

    def __str__(self):
        return f"{self.title} - {self.amount_per_unit}"


PeriodicCharge = MasterCharge


class UnitChargeStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    PAID = "Paid", "Paid"


class UnitCharge(models.Model):
    master_charge = models.ForeignKey(
        MasterCharge,
        on_delete=models.CASCADE,
        related_name="unit_charges",
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name="unit_charges",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=UnitChargeStatus.choices,
        default=UnitChargeStatus.PENDING,
    )
    # Set when the resident settles the charge. Null while Pending, and also
    # null for anything settled before this column existed, so payment history
    # must tolerate a missing timestamp rather than invent one.
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"UnitCharge #{self.pk} - {self.unit} - {self.amount} ({self.status})"
