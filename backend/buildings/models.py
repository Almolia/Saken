from decimal import Decimal

from django.conf import settings
from django.db import models


class Building(models.Model):
    name = models.CharField(max_length=100)
    # Shared fund a manager can settle service request costs against.
    building_wallet_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    def __str__(self):
        return self.name


class OccupancyStatus(models.TextChoices):
    OCCUPIED = "Occupied", "Occupied"
    VACANT = "Vacant", "Vacant"
    UNDER_RENOVATION = "UnderRenovation", "Under Renovation"


class Unit(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="units",
        null=True,
        blank=True,
    )
    building = models.ForeignKey(
        Building,
        on_delete=models.PROTECT,
        related_name="units",
        null=True,
        blank=True,
    )
    unit_number = models.CharField(max_length=20)
    floor = models.IntegerField()
    area = models.DecimalField(max_digits=8, decimal_places=2)
    details = models.TextField(blank=True)
    # Kept independent of `owner`: a unit can be held vacant while a resident is
    # still linked to it (mid-move-out), or be closed for renovation.
    occupancy_status = models.CharField(
        max_length=20,
        choices=OccupancyStatus.choices,
        default=OccupancyStatus.VACANT,
    )
    # Outstanding charges billed to this unit, in the building's currency.
    debt = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    def __str__(self):
        owner_name = self.owner.full_name if self.owner else "No owner"
        return f"Unit {self.unit_number} | Floor {self.floor} | Owner: {owner_name}"
