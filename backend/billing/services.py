"""Financial settlement of completed service requests and periodic charges.

Money is handled entirely in Decimal. Every routing rule runs inside a single
transaction so a partially applied settlement or charge issue can never be committed.
"""
from collections import defaultdict
from decimal import Decimal, InvalidOperation, ROUND_DOWN

from billing.models import MasterCharge, UnitCharge, UnitChargeStatus
from buildings.models import Building, Unit
from common.constants import (
    ChargeMessages,
    PaymentMessages,
    ServiceRequestMessages,
    SettlementMessages,
)
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from maintenance.models import PaymentMethod, RequestStatus, ServiceRequest

CENT = Decimal("0.01")


class SettlementError(Exception):
    """Raised when a settlement or billing action cannot be applied. Message is user-facing."""


class ChargeNotFoundError(SettlementError):
    """Raised when the targeted charge does not exist, so views can answer 404."""


def _clean_cost(cost, message=SettlementMessages.COST_MUST_BE_POSITIVE):
    try:
        amount = Decimal(str(cost))
    except (InvalidOperation, TypeError, ValueError):
        raise SettlementError(message)

    if not amount.is_finite() or amount <= 0:
        raise SettlementError(message)

    return amount.quantize(CENT, rounding=ROUND_DOWN)


def _totals_by(charges, key):
    """Total the charge amounts per unit (or per building).

    Lets each affected row be updated once instead of once per charge, which
    matters as soon as a resident owns more than one unit.
    """
    totals = defaultdict(Decimal)
    for charge in charges:
        totals[key(charge)] += charge.amount
    return totals


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


@transaction.atomic
def process_resident_payment(user, charge_ids):
    """Settle the resident's own pending charges and move the money.

    Flips every selected charge to Paid, lowers the owning unit's debt and
    credits the building wallet by the same total, all in one transaction.
    Returns the settled charges. Raises SettlementError with a user-facing
    message when the payment is not allowed.
    """
    unique_ids = list(dict.fromkeys(charge_ids))
    if len(unique_ids) != len(charge_ids):
        raise SettlementError(PaymentMessages.DUPLICATE_CHARGE_IDS)

    # Locked for the whole transaction. Without this, two payments submitted at
    # the same time for the same bills could both pass the Pending check below,
    # and each would apply its own debt decrease and wallet credit.
    charges = list(
        UnitCharge.objects.select_for_update()
        .select_related("unit")
        .filter(pk__in=unique_ids)
    )

    if len(charges) != len(unique_ids):
        raise SettlementError(PaymentMessages.INVALID_CHARGE_IDS)

    if any(charge.unit.owner_id != user.pk for charge in charges):
        raise SettlementError(PaymentMessages.CHARGE_NOT_OWNED)

    if any(charge.status != UnitChargeStatus.PENDING for charge in charges):
        raise SettlementError(PaymentMessages.CHARGE_ALREADY_PAID)

    # Unit.building is nullable. Crediting a null building id would match no
    # rows, so the debt would fall with nothing to receive the money and the
    # payment would quietly vanish from the building's books.
    if any(charge.unit.building_id is None for charge in charges):
        raise SettlementError(PaymentMessages.BUILDING_NOT_RESOLVED)

    paid_at = timezone.now()
    UnitCharge.objects.filter(pk__in=unique_ids).update(
        status=UnitChargeStatus.PAID,
        paid_at=paid_at,
    )

    for unit_id, amount in _totals_by(charges, lambda charge: charge.unit_id).items():
        Unit.objects.filter(pk=unit_id).update(debt=F("debt") - amount)

    for building_id, amount in _totals_by(charges, lambda charge: charge.unit.building_id).items():
        Building.objects.filter(pk=building_id).update(
            building_wallet_balance=F("building_wallet_balance") + amount
        )

    for charge in charges:
        charge.status = UnitChargeStatus.PAID
        charge.paid_at = paid_at

    return charges


@transaction.atomic
def update_periodic_charge(
        charge_id,
        title=None,
        description=None,
        due_date=None,
        amount_per_unit=None,
):
    """Correct an already-issued charge, realigning unit debt when the amount moves.

    Only the fields that are passed are touched. The amount is frozen the
    moment anyone pays: a paid UnitCharge has already moved money into the
    building wallet, so re-pricing it would leave the ledger describing a
    payment that never happened. Title, description and due date stay editable.
    """
    try:
        master_charge = MasterCharge.objects.select_for_update().get(pk=charge_id)
    except MasterCharge.DoesNotExist:
        raise ChargeNotFoundError(ChargeMessages.CHARGE_NOT_FOUND)

    if title is not None:
        title = title.strip()
        if not title:
            raise SettlementError(ChargeMessages.TITLE_REQUIRED)
        master_charge.title = title

    if description is not None:
        master_charge.description = description.strip()

    if due_date is not None:
        master_charge.due_date = due_date

    if amount_per_unit is not None:
        amount = _clean_cost(amount_per_unit, ChargeMessages.AMOUNT_MUST_BE_POSITIVE)
        unit_charges = list(
            UnitCharge.objects.select_for_update().filter(master_charge=master_charge)
        )

        if any(charge.status != UnitChargeStatus.PENDING for charge in unit_charges):
            raise SettlementError(ChargeMessages.AMOUNT_LOCKED_AFTER_PAYMENT)

        delta = amount - master_charge.amount_per_unit
        if delta:
            # One UnitCharge per unit, so a single UPDATE applies the delta
            # exactly once to each affected unit.
            unit_ids = {charge.unit_id for charge in unit_charges}
            Unit.objects.filter(pk__in=unit_ids).update(debt=F("debt") + delta)
            UnitCharge.objects.filter(master_charge=master_charge).update(amount=amount)

        master_charge.amount_per_unit = amount

    master_charge.save(
        update_fields=["title", "description", "due_date", "amount_per_unit"]
    )
    return master_charge


@transaction.atomic
def delete_periodic_charge(charge_id):
    """Cancel an issued charge and roll its debt back off the affected units.

    Blocked once any unit charge is paid: that money already sits in the
    building wallet, so cancelling would require a refund, which is not part of
    this flow. Deleting the master charge cascades to its unit charges.
    """
    try:
        master_charge = MasterCharge.objects.select_for_update().get(pk=charge_id)
    except MasterCharge.DoesNotExist:
        raise ChargeNotFoundError(ChargeMessages.CHARGE_NOT_FOUND)

    unit_charges = list(
        UnitCharge.objects.select_for_update().filter(master_charge=master_charge)
    )

    if any(charge.status != UnitChargeStatus.PENDING for charge in unit_charges):
        raise SettlementError(ChargeMessages.DELETE_LOCKED_AFTER_PAYMENT)

    for unit_id, amount in _totals_by(unit_charges, lambda charge: charge.unit_id).items():
        Unit.objects.filter(pk=unit_id).update(debt=F("debt") - amount)

    master_charge.delete()
