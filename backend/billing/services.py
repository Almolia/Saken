"""Financial settlement of completed service requests and periodic charges.

Money is handled entirely in Decimal. Every routing rule runs inside a single
transaction so a partially applied settlement or charge issue can never be committed.

Ledger invariant
----------------
``Unit.debt`` must always equal the sum of that unit's PENDING ``UnitCharge``
amounts::

    Unit.debt == sum(UnitCharge.amount for PENDING charges on the unit)

Every flow in this module therefore moves money by creating/flipping
``UnitCharge`` rows and mirroring the exact same amounts on ``Unit.debt``:

* periodic charges create Pending rows and raise debt by the same amounts;
* settlements that bill units (Equal Split / Requester Only) also create
  Pending rows first, then raise debt — a settled cost must stay payable;
* payments flip rows to Paid and lower debt by the same amounts;
* edits and deletions realign debt with whatever the rows now describe.

Costs routed through the building wallet never touch unit debt, so they never
create charge rows either.

Single building
---------------
The app manages exactly one building, so nothing here is scoped by a building
id: "all units" means the whole Unit table, and the shared fund is the one
``Building`` row (see ``Building.get_solo``). Units no longer carry a building
reference — the nullable one they used to have was never populated by the UI,
which made charges skip units and blocked settlements and payments outright.
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


class ServiceRequestNotFoundError(SettlementError):
    """Raised when the service request being settled does not exist, so views can answer 404."""


def _clean_cost(cost, message=SettlementMessages.COST_MUST_BE_POSITIVE):
    try:
        amount = Decimal(str(cost))
    except (InvalidOperation, TypeError, ValueError):
        raise SettlementError(message)

    if not amount.is_finite() or amount <= 0:
        raise SettlementError(message)

    return amount.quantize(CENT, rounding=ROUND_DOWN)


def _totals_by(charges, key):
    """Total the charge amounts per key (in practice, per unit).

    Lets each affected row be updated once instead of once per charge, which
    matters as soon as a resident owns more than one unit.
    """
    totals = defaultdict(Decimal)
    for charge in charges:
        totals[key(charge)] += charge.amount
    return totals


def _split_cost(cost, unit_count):
    """Split the cost into one amount per unit, in order.

    The per-unit share is rounded down, then the leftover cents are handed out
    one each to the first units. That keeps the total charged exactly equal to
    the cost while never putting more than a single cent between any two units,
    so no one unit absorbs the whole rounding remainder.
    """
    share = (cost / (Decimal(unit_count) + 1)).quantize(CENT, rounding=ROUND_DOWN)
    amounts = [share] * unit_count

    # Always fewer leftover cents than units, since share is the floor.
    leftover_cents = int((cost - share * unit_count) / CENT)
    for index in range(leftover_cents):
        amounts[index] += CENT

    return amounts


def _resolve_requester_unit(service_request):
    unit = (
        Unit.objects.filter(owner_id=service_request.resident_id)
        .order_by("unit_number", "id")
        .first()
    )
    if unit is None:
        raise SettlementError(SettlementMessages.REQUESTER_HAS_NO_UNIT)
    return unit


def _record_unit_charges(service_request, settled_by, unit_amounts, apply_to_all):
    """Create the settlement's ledger rows and raise each unit's debt to match.

    Writes one MasterCharge (titled after the service request) plus one Pending
    UnitCharge per charged unit, then bumps Unit.debt by exactly the charged
    amounts. That keeps the invariant ``Unit.debt == sum(PENDING UnitCharge)``
    intact, which is what makes the settled cost visible in the resident's
    pending charges and therefore payable at all.
    """
    # Settlement bills are payable right away: the work is already done and the
    # manager has just routed the cost, so there is no future period to defer to.
    master_charge = MasterCharge.objects.create(
        title=service_request.title,
        description=service_request.description,
        amount_per_unit=min(amount for _, amount in unit_amounts),
        due_date=timezone.localdate(),
        apply_to_all=apply_to_all,
        created_by=settled_by,
    )

    UnitCharge.objects.bulk_create(
        [
            UnitCharge(
                master_charge=master_charge,
                unit=unit,
                amount=amount,
                status=UnitChargeStatus.PENDING,
            )
            for unit, amount in unit_amounts
        ]
    )

    debt_by_unit = defaultdict(Decimal)
    for unit, amount in unit_amounts:
        debt_by_unit[unit.pk] += amount

    for unit_id, amount in debt_by_unit.items():
        Unit.objects.filter(pk=unit_id).update(debt=F("debt") + amount)

    return master_charge


def _charge_every_unit(service_request, cost, settled_by):
    """Split the cost across every unit.

    The app manages a single building, so "every unit" is exactly the whole
    Unit table — no building scoping is involved, and the split can no longer
    be blocked by a unit that has no building recorded.
    """
    # The requester must still own a unit: settling a request from someone who
    # lives nowhere is a data problem the manager needs to see.
    _resolve_requester_unit(service_request)

    units = list(Unit.objects.order_by("unit_number", "id"))
    if not units:
        raise SettlementError(SettlementMessages.NO_UNITS_TO_SPLIT)

    _record_unit_charges(
        service_request,
        settled_by,
        list(zip(units, _split_cost(cost, len(units)))),
        apply_to_all=True,
    )


def _charge_requester(service_request, cost, settled_by):
    unit = _resolve_requester_unit(service_request)
    _record_unit_charges(
        service_request, settled_by, [(unit, cost)], apply_to_all=False
    )


def _charge_building_wallet(service_request, cost, settled_by):
    # The requester must own a unit, exactly as for the other routing rules.
    _resolve_requester_unit(service_request)

    # Locked so two concurrent settlements cannot both pass the funds check.
    building = Building.get_solo(for_update=True)
    if building.building_wallet_balance < cost:
        raise SettlementError(SettlementMessages.INSUFFICIENT_WALLET_BALANCE)

    building.building_wallet_balance -= cost
    building.save(update_fields=["building_wallet_balance"])


_HANDLERS = {
    PaymentMethod.EQUAL_SPLIT: _charge_every_unit,
    PaymentMethod.REQUESTER_ONLY: _charge_requester,
    PaymentMethod.BUILDING_WALLET: _charge_building_wallet,
}


@transaction.atomic
def process_request_settlement(request_id, cost, method, settled_by=None):
    """Route the cost of a completed service request and mark it settled.

    Returns the refreshed ServiceRequest. Raises SettlementError with a
    user-facing message when the settlement is not allowed.

    This function is the single source of truth for settlement validation:
    callers must not pre-check status/is_settled outside the transaction, or
    two concurrent requests could both pass the check before either commits.
    """
    amount = _clean_cost(cost)

    if method not in _HANDLERS:
        raise SettlementError(SettlementMessages.INVALID_PAYMENT_METHOD)

    try:
        # Locked for the whole transaction so a request cannot be settled twice.
        service_request = ServiceRequest.objects.select_for_update().get(pk=request_id)
    except ServiceRequest.DoesNotExist:
        raise ServiceRequestNotFoundError(ServiceRequestMessages.REQUEST_NOT_FOUND)

    if service_request.status != RequestStatus.COMPLETED:
        raise SettlementError(SettlementMessages.REQUEST_NOT_COMPLETED)

    if service_request.is_settled:
        raise SettlementError(SettlementMessages.ALREADY_SETTLED)

    _HANDLERS[method](service_request, amount, settled_by)

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

    ``apply_to_all`` means every registered unit, since the app manages a
    single building. All mutations execute in a single atomic transaction.
    """
    amount = _clean_cost(amount_per_unit)
    title = (title or "").strip()
    if not title:
        raise SettlementError(ChargeMessages.TITLE_REQUIRED)
    if not due_date:
        raise SettlementError(ChargeMessages.DUE_DATE_REQUIRED)

    if apply_to_all:
        # Every unit in the app, with no building filter: a unit that has no
        # building recorded used to be skipped here, so residents silently
        # stopped being billed.
        targeted_units = list(Unit.objects.order_by("floor", "unit_number"))
        if not targeted_units:
            raise SettlementError(SettlementMessages.NO_UNITS_TO_SPLIT)
    else:
        unit_ids = unit_ids or []
        targeted_units = list(Unit.objects.filter(pk__in=unit_ids).order_by("floor", "unit_number"))

    if not targeted_units:
        raise SettlementError(ChargeMessages.NO_UNITS_TO_APPLY)

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

    # All money lands in the one building's shared fund. The row is locked (and
    # created if the manager has not registered the building yet) before the
    # charges flip, so the credit can never be lost — this used to reject the
    # payment outright whenever a unit had no building recorded.
    building = Building.get_solo(for_update=True)

    paid_at = timezone.now()
    UnitCharge.objects.filter(pk__in=unique_ids).update(
        status=UnitChargeStatus.PAID,
        paid_at=paid_at,
    )

    for unit_id, amount in _totals_by(charges, lambda charge: charge.unit_id).items():
        Unit.objects.filter(pk=unit_id).update(debt=F("debt") - amount)

    total_paid = sum((charge.amount for charge in charges), Decimal("0.00"))
    Building.objects.filter(pk=building.pk).update(
        building_wallet_balance=F("building_wallet_balance") + total_paid
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
