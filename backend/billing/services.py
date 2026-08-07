"""Financial settlement of completed service requests and periodic charges.

Money is handled entirely in Decimal. Every routing rule runs inside a single
transaction so a partially applied settlement or charge issue can never be committed.
"""
from decimal import Decimal, InvalidOperation, ROUND_DOWN

from django.db import transaction
from django.db.models import F

from billing.models import MasterCharge, UnitCharge, UnitChargeStatus
from buildings.models import Building, Unit
from common.constants import ServiceRequestMessages, SettlementMessages
from maintenance.models import PaymentMethod, RequestStatus, ServiceRequest

CENT = Decimal("0.01")


class SettlementError(Exception):
    """Raised when a settlement or billing action cannot be applied. Message is user-facing."""


def _clean_cost(cost):
    try:
        amount = Decimal(str(cost))
    except (InvalidOperation, TypeError, ValueError):
        raise SettlementError(SettlementMessages.COST_MUST_BE_POSITIVE)

    if not amount.is_finite() or amount <= 0:
        raise SettlementError(SettlementMessages.COST_MUST_BE_POSITIVE)

    return amount.quantize(CENT, rounding=ROUND_DOWN)


def _resolve_requester_unit(service_request):
    unit = (
        Unit.objects.filter(owner_id=service_request.resident_id)
        .order_by("unit_number", "id")
        .first()
    )
    if unit is None:
        raise SettlementError(SettlementMessages.REQUESTER_HAS_NO_UNIT)
    return unit


def _charge_every_unit(cost):
    """Split the cost across every registered unit.

    The per-unit share is rounded down, then the leftover cents are handed out
    one each to the first units. That keeps the total charged exactly equal to
    the cost while never putting more than a single cent between any two units,
    so no one unit absorbs the whole rounding remainder.
    """
    unit_ids = list(Unit.objects.order_by("unit_number", "id").values_list("id", flat=True))
    if not unit_ids:
        raise SettlementError(SettlementMessages.NO_UNITS_TO_SPLIT)

    unit_count = len(unit_ids)
    share = (cost / Decimal(unit_count)).quantize(CENT, rounding=ROUND_DOWN)
    if share > 0:
        Unit.objects.update(debt=F("debt") + share)

    # Always fewer leftover cents than units, since share is the floor.
    leftover_cents = int((cost - share * unit_count) / CENT)
    if leftover_cents:
        Unit.objects.filter(pk__in=unit_ids[:leftover_cents]).update(debt=F("debt") + CENT)


def _charge_requester(service_request, cost):
    unit = _resolve_requester_unit(service_request)
    Unit.objects.filter(pk=unit.pk).update(debt=F("debt") + cost)


def _charge_building_wallet(service_request, cost):
    unit = _resolve_requester_unit(service_request)
    if unit.building_id is None:
        raise SettlementError(SettlementMessages.BUILDING_NOT_RESOLVED)

    # Locked so two concurrent settlements cannot both pass the funds check.
    building = Building.objects.select_for_update().get(pk=unit.building_id)
    if building.building_wallet_balance < cost:
        raise SettlementError(SettlementMessages.INSUFFICIENT_WALLET_BALANCE)

    building.building_wallet_balance -= cost
    building.save(update_fields=["building_wallet_balance"])


_HANDLERS = {
    PaymentMethod.EQUAL_SPLIT: lambda service_request, cost: _charge_every_unit(cost),
    PaymentMethod.REQUESTER_ONLY: _charge_requester,
    PaymentMethod.BUILDING_WALLET: _charge_building_wallet,
}


@transaction.atomic
def process_request_settlement(request_id, cost, method):
    """Route the cost of a completed service request and mark it settled.

    Returns the refreshed ServiceRequest. Raises SettlementError with a
    user-facing message when the settlement is not allowed.
    """
    amount = _clean_cost(cost)

    if method not in _HANDLERS:
        raise SettlementError(SettlementMessages.INVALID_PAYMENT_METHOD)

    try:
        # Locked for the whole transaction so a request cannot be settled twice.
        service_request = ServiceRequest.objects.select_for_update().get(pk=request_id)
    except ServiceRequest.DoesNotExist:
        raise SettlementError(ServiceRequestMessages.REQUEST_NOT_FOUND)

    if service_request.status != RequestStatus.COMPLETED:
        raise SettlementError(SettlementMessages.REQUEST_NOT_COMPLETED)

    if service_request.is_settled:
        raise SettlementError(SettlementMessages.ALREADY_SETTLED)

    _HANDLERS[method](service_request, amount)

    service_request.cost = amount
    service_request.payment_method = method
    service_request.is_settled = True
    service_request.save(update_fields=["cost", "payment_method", "is_settled"])

    return service_request


@transaction.atomic
def create_periodic_charge(
    manager_user,
    title,
    amount_per_unit,
    due_date,
    description="",
    apply_to_all=True,
    unit_ids=None,
):
    """Issues a master periodic charge, creates unit charge invoices, and increments unit debt.

    All mutations execute in a single atomic transaction.
    """
    amount = _clean_cost(amount_per_unit)
    title = (title or "").strip()
    if not title:
        raise SettlementError("عنوان شارژ الزامی است.")
    if not due_date:
        raise SettlementError("مهلت پرداخت الزامی است.")

    if apply_to_all:
        targeted_units = list(Unit.objects.order_by("floor", "unit_number").all())
    else:
        unit_ids = unit_ids or []
        targeted_units = list(Unit.objects.filter(pk__in=unit_ids).order_by("floor", "unit_number"))

    if not targeted_units:
        raise SettlementError("هیچ واحدی برای اعمال شارژ یافت نشد.")

    master_charge = MasterCharge.objects.create(
        title=title,
        description=(description or "").strip(),
        amount_per_unit=amount,
        due_date=due_date,
        apply_to_all=bool(apply_to_all),
        created_by=manager_user,
    )

    unit_charges = [
        UnitCharge(
            master_charge=master_charge,
            unit=unit,
            amount=amount,
            status=UnitChargeStatus.PENDING,
        )
        for unit in targeted_units
    ]
    UnitCharge.objects.bulk_create(unit_charges)

    target_pks = [u.pk for u in targeted_units]
    Unit.objects.filter(pk__in=target_pks).update(debt=F("debt") + amount)

    return master_charge
