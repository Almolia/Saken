from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from users.permissions import IsManagerOrAdmin
from .models import MasterCharge
from .serializers import MasterChargeSerializer
from .services import SettlementError, create_periodic_charge


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
