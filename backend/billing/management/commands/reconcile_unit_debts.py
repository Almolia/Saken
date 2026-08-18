"""Realign Unit.debt with the billing ledger.

Settlements processed before the settlement ledger fix bumped Unit.debt
without creating UnitCharge rows, so pre-fix balances can drift from the
ledger and may contain debt a resident can never see or pay. This command
recomputes every unit's debt as the sum of its PENDING UnitCharge amounts —
the invariant billing.services maintains for every new operation.

Safety: previews by default and only writes when --apply is passed.
"""
from decimal import Decimal

from billing.models import UnitCharge, UnitChargeStatus
from buildings.models import Unit
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum


class Command(BaseCommand):
    help = (
        "Recompute each unit's debt from its pending UnitCharge rows "
        "(preview only unless --apply is passed)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write the corrections to the database (default: preview only).",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]

        pending_totals = {
            row["unit_id"]: row["total"]
            for row in UnitCharge.objects.filter(status=UnitChargeStatus.PENDING)
            .values("unit_id")
            .annotate(total=Sum("amount"))
        }

        drifted = []
        for unit in Unit.objects.order_by("id"):
            expected = (pending_totals.get(unit.pk) or Decimal("0.00")).quantize(
                Decimal("0.01")
            )
            if unit.debt != expected:
                drifted.append((unit, expected))

        if not drifted:
            self.stdout.write(self.style.SUCCESS("همه واحدها با ledger سازگارند."))
            return

        for unit, expected in drifted:
            self.stdout.write(
                f"واحد {unit.unit_number} (id={unit.pk}): "
                f"بدهی فعلی {unit.debt} -> انتظار {expected}"
            )

        if not apply_changes:
            self.stdout.write(
                self.style.WARNING(
                    f"{len(drifted)} واحد ناسازگار یافت شد. "
                    "برای اعمال تغییرات دستور را با --apply اجرا کنید."
                )
            )
            return

        with transaction.atomic():
            for unit, expected in drifted:
                Unit.objects.filter(pk=unit.pk).update(debt=expected)

        self.stdout.write(
            self.style.SUCCESS(f"بدهی {len(drifted)} واحد با ledger هم‌تراز شد.")
        )
