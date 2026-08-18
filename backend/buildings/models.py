from decimal import Decimal

from django.conf import settings
from django.db import models

# The app manages exactly one building, so the Building table holds a single
# row and that row always has this id. Nothing else in the schema stores a
# building reference: units, charges and service requests all belong to this
# one building implicitly.
SOLO_BUILDING_PK = 1

# Used only when a building row has to exist before the manager has filled the
# settings form in (for example the first resident payment crediting the
# shared fund). The manager can rename it at any time.
DEFAULT_BUILDING_NAME = "ساختمان"


class Building(models.Model):
    """The one building this installation manages.

    Enforced as a singleton in three layers so a second row cannot appear:
    `save()` pins the primary key, a database check constraint rejects any
    other id, and every read goes through `get_solo()`.
    """

    name = models.CharField(max_length=100)
    # Shared fund a manager can settle service request costs against.
    building_wallet_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(id=SOLO_BUILDING_PK),
                name="buildings_building_is_singleton",
            ),
        ]

    def save(self, *args, **kwargs):
        # Every Building row is THE building, so writing one always targets the
        # same id instead of silently adding a second building. `create()` asks
        # for an INSERT; when the row is already there that would raise, so it
        # is downgraded to an update of the existing record.
        self.pk = SOLO_BUILDING_PK
        if kwargs.get("force_insert") and type(self)._solo_exists():
            kwargs["force_insert"] = False
        return super().save(*args, **kwargs)

    @classmethod
    def _solo_exists(cls):
        return cls.objects.filter(pk=SOLO_BUILDING_PK).exists()

    @classmethod
    def get_solo(cls, for_update=False):
        """Return the single building, creating it if it does not exist yet.

        Money flows (resident payments, wallet settlements) must never fail
        just because the manager has not opened the settings form yet, so this
        falls back to creating the record with a default name.

        Pass ``for_update=True`` inside a transaction to lock the row before
        changing the wallet balance.
        """
        queryset = cls.objects.select_for_update() if for_update else cls.objects
        building = queryset.filter(pk=SOLO_BUILDING_PK).first()
        if building is not None:
            return building

        # bulk_create bypasses save() and, with ignore_conflicts, is a no-op if
        # another request registered the building first — so a manager-supplied
        # name can never be overwritten by this default one.
        cls.objects.bulk_create(
            [cls(pk=SOLO_BUILDING_PK, name=DEFAULT_BUILDING_NAME)],
            ignore_conflicts=True,
        )
        return queryset.get(pk=SOLO_BUILDING_PK)

    @classmethod
    def get_solo_or_none(cls, for_update=False):
        """Return the single building, or None when it has not been created.

        Used by the manager settings endpoints, which distinguish "not
        registered yet" (404 + registration form) from "registered".
        """
        queryset = cls.objects.select_for_update() if for_update else cls.objects
        return queryset.filter(pk=SOLO_BUILDING_PK).first()

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
    # No building foreign key on purpose: the app manages a single building,
    # so every unit belongs to it implicitly. Storing (and checking) a building
    # id here only produced "the building is unknown" failures on units that
    # were created without one.
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
