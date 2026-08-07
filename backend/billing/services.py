"""Financial settlement of completed service requests.

Money is handled entirely in Decimal. Every routing rule runs inside a single
transaction so a partially applied settlement can never be committed.
"""
from decimal import Decimal, InvalidOperation, ROUND_DOWN

from django.db import transaction
from django.db.models import F

from buildings.models import Building, Unit
from common.constants import ServiceRequestMessages, SettlementMessages
from maintenance.models import PaymentMethod, RequestStatus, ServiceRequest

CENT = Decimal("0.01")


class SettlementError(Exception):
    """Raised when a settlement cannot be applied. Message is user-facing."""


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

    The per-unit share is rounded down and the leftover cents land on the first
    unit, so the debt actually created always adds up to the cost exactly.
    """
    unit_ids = list(Unit.objects.order_by("unit_number", "id").values_list("id", flat=True))
    if not unit_ids:
        raise SettlementError(SettlementMessages.NO_UNITS_TO_SPLIT)

    share = (cost / Decimal(len(unit_ids))).quantize(CENT, rounding=ROUND_DOWN)
    Unit.objects.update(debt=F("debt") + share)

    remainder = cost - (share * len(unit_ids))
    if remainder > 0:
        Unit.objects.filter(pk=unit_ids[0]).update(debt=F("debt") + remainder)


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
