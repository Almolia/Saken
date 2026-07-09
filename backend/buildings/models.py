from django.conf import settings
from django.db import models


class Building(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


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

    def __str__(self):
        owner_name = self.owner.full_name if self.owner else "No owner"
        return f"Unit {self.unit_number} | Floor {self.floor} | Owner: {owner_name}"
