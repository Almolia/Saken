"""Collapse the data model down to the single building the app manages.

Three things happen here, in this order:

1. ``Unit.building`` is dropped. The app has always managed exactly one
   building, so the column carried no information — but it *was* nullable, and
   every unit created without it made settlements and payments fail with
   "the building of this request is unknown".
2. Whatever building rows exist are merged into one row with id=1: the oldest
   row's name wins and every wallet balance is added together so no money is
   lost, even in the (previously possible) case of stray extra rows.
3. A check constraint pins the table to that single id from now on.

The reverse migration restores the nullable column — pointing every unit at
the surviving building — so the change can be rolled back without data loss.
"""
from decimal import Decimal

from django.db import migrations, models

SOLO_BUILDING_PK = 1


def merge_buildings_into_one(apps, schema_editor):
    Building = apps.get_model("buildings", "Building")

    buildings = list(Building.objects.order_by("id"))
    if not buildings:
        # Nothing registered yet: the manager settings screen still offers the
        # registration form, which will create the row at id=1.
        return

    total_balance = sum(
        (building.building_wallet_balance or Decimal("0.00") for building in buildings),
        Decimal("0.00"),
    )
    primary = buildings[0]

    survivor = next(
        (building for building in buildings if building.pk == SOLO_BUILDING_PK),
        None,
    )
    if survivor is None:
        # `Building.save()` pins the pk on the concrete model, but historical
        # models in migrations do not have that override, so the row is created
        # explicitly at the canonical id.
        survivor = Building.objects.create(
            pk=SOLO_BUILDING_PK,
            name=primary.name,
            building_wallet_balance=total_balance,
        )
    else:
        survivor.name = primary.name
        survivor.building_wallet_balance = total_balance
        survivor.save(update_fields=["name", "building_wallet_balance"])

    Building.objects.exclude(pk=SOLO_BUILDING_PK).delete()


def link_units_to_the_building(apps, schema_editor):
    """Reverse step: point every unit at the surviving building."""
    Building = apps.get_model("buildings", "Building")
    Unit = apps.get_model("buildings", "Unit")

    building = Building.objects.order_by("id").first()
    if building is not None:
        Unit.objects.update(building=building)


class Migration(migrations.Migration):

    dependencies = [
        ("buildings", "0004_unit_occupancy_status"),
    ]

    operations = [
        # Forward: nothing. On reverse this runs last — after RemoveField has
        # been undone and the column exists again — and repoints every unit at
        # the building.
        migrations.RunPython(migrations.RunPython.noop, link_units_to_the_building),
        migrations.RemoveField(
            model_name="unit",
            name="building",
        ),
        migrations.RunPython(merge_buildings_into_one, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="building",
            constraint=models.CheckConstraint(
                condition=models.Q(("id", SOLO_BUILDING_PK)),
                name="buildings_building_is_singleton",
            ),
        ),
    ]
