from decimal import Decimal

from common.constants import ChargeMessages, PaymentMessages
from django.db.models import F, Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, generics, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from users.permissions import IsManagerOrAdmin, IsResident

from .filters import UnitChargeReportFilter
from .models import MasterCharge, UnitCharge, UnitChargeStatus
from .serializers import (
    MasterChargeSerializer,
    MasterChargeUpdateSerializer,
    ResidentChargeSerializer,
    ResidentPendingChargeSerializer,
    ResidentPaymentSerializer,
    UnitChargeSearchSerializer,
)
from .services import (
    CENT,
    ChargeNotFoundError,
    SettlementError,
    create_periodic_charge,
    delete_periodic_charge,
    process_resident_payment,
    update_periodic_charge,
)


class ResidentPendingChargesView(APIView):
    """GET the current resident's pending (unpaid) charges only.

    Strictly scoped to the authenticated resident: only UnitCharge records
    linked to one of the user's own units and still in the Pending state are
    returned. Uses the IsResident permission so managers/staff cannot access it.
    """

    permission_classes = [IsResident]

    def get(self, request):
        charges = (
            UnitCharge.objects.select_related("master_charge", "unit")
            .filter(unit__owner=request.user, status=UnitChargeStatus.PENDING)
            .order_by("master_charge__due_date", "-id")
        )
        return Response(
            {"charges": ResidentPendingChargeSerializer(charges, many=True).data}
        )


class ResidentPaymentHistoryView(APIView):
    """GET the current resident's settled charges, newest payment first.

    Scoped exactly like the pending endpoint: only UnitCharge records on one of
    the user's own units, and only those already Paid. Charges settled before
    `paid_at` existed have no timestamp, so they sort last rather than
    unpredictably by backend NULL ordering.
    """

    permission_classes = [IsResident]

    def get(self, request):
        charges = (
            UnitCharge.objects.select_related("master_charge", "unit")
            .filter(unit__owner=request.user, status=UnitChargeStatus.PAID)
            .order_by(F("paid_at").desc(nulls_last=True), "-id")
        )

        total_paid = charges.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        return Response(
            {
                "charges": ResidentChargeSerializer(charges, many=True).data,
                # Quantized so the total is formatted like every other amount:
                # SQLite's SUM drops the scale and would return "350000".
                "total_paid": str(total_paid.quantize(CENT)),
            }
        )


class ResidentPaymentView(APIView):
    permission_classes = [IsResident]

    def post(self, request):
        serializer = ResidentPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data

        try:
            process_resident_payment(
                user=request.user,
                charge_ids=validated["charge_ids"],
            )
        except SettlementError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": PaymentMessages.PAYMENT_SUCCESS},
            status=status.HTTP_200_OK,
        )


class ManagerPeriodicChargeListView(APIView):
    """GET master list of charges & POST new periodic charge."""
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        charges = (
            MasterCharge.objects.prefetch_related('unit_charges', 'unit_charges__unit')
            .order_by('-created_at', '-id')
        )
        return Response({
            'charges': MasterChargeSerializer(charges, many=True).data,
        })

    def post(self, request):
        serializer = MasterChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data
        try:
            charge = create_periodic_charge(
                manager_user=request.user,
                title=validated['title'],
                amount_per_unit=validated['amount_per_unit'],
                due_date=validated['due_date'],
                description=validated.get('description', ''),
                apply_to_all=validated.get('apply_to_all', True),
                unit_ids=validated.get('unit_ids', []),
            )
        except SettlementError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        charge = MasterCharge.objects.prefetch_related('unit_charges', 'unit_charges__unit').get(pk=charge.pk)

        return Response(
            {
                'message': 'شارژ جدید با موفقیت صادر شد.',
                'charge': MasterChargeSerializer(charge).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ManagerPeriodicChargeDetailView(APIView):
    """PATCH to correct an issued charge, DELETE to cancel it.

    Both operations keep unit debt in step with the change, and both refuse
    once any unit charge on the master charge has been paid — that money has
    already reached the building wallet and undoing it would need a refund.
    """

    permission_classes = [IsManagerOrAdmin]

    def patch(self, request, pk):
        serializer = MasterChargeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            charge = update_periodic_charge(charge_id=pk, **serializer.validated_data)
        except ChargeNotFoundError as error:
            return Response({'detail': str(error)}, status=status.HTTP_404_NOT_FOUND)
        except SettlementError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        charge = MasterCharge.objects.prefetch_related(
            'unit_charges', 'unit_charges__unit'
        ).get(pk=charge.pk)

        return Response(
            {
                'message': ChargeMessages.CHARGE_UPDATED,
                'charge': MasterChargeSerializer(charge).data,
            }
        )

    def delete(self, request, pk):
        try:
            delete_periodic_charge(charge_id=pk)
        except ChargeNotFoundError as error:
            return Response({'detail': str(error)}, status=status.HTTP_404_NOT_FOUND)
        except SettlementError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': ChargeMessages.CHARGE_DELETED})


class ManagerFinancialSummaryView(APIView):
    """
    GET: Returns the total collected revenue and total outstanding debt for the building.
    """
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        total_revenue = UnitCharge.objects.filter(
            status=UnitChargeStatus.PAID
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        total_debt = UnitCharge.objects.filter(
            status=UnitChargeStatus.PENDING
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        return Response({
            'total_collected_revenue': str(total_revenue.quantize(Decimal('0.01'))),
            'total_outstanding_debt': str(total_debt.quantize(Decimal('0.01'))),
        })

class ManagerChargeSearchListView(generics.ListAPIView):
    """Return the complete per-unit financial ledger for manager reports.

    Text search covers actual text columns only. Status, creation dates and
    numeric amounts are filtered through explicit, validated query parameters.

    Response contract: this report endpoint returns a bare JSON array. The
    explicit ``list`` implementation below keeps that shape stable even if DRF
    pagination is enabled globally in the future.
    """

    permission_classes = [IsManagerOrAdmin]
    serializer_class = UnitChargeSearchSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = UnitChargeReportFilter
    pagination_class = None
    search_fields = [
        'unit__unit_number',
        'master_charge__title',
        'master_charge__description',
    ]
    queryset = (
        UnitCharge.objects.select_related('unit', 'master_charge')
        .all()
        .order_by('-created_at', '-id')
    )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
