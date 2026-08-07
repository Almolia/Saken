from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from users.permissions import IsManagerOrAdmin
from .models import PeriodicCharge
from .serializers import PeriodicChargeSerializer


class ManagerPeriodicChargeListView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        charges = PeriodicCharge.objects.prefetch_related('units', 'units__owner').all()
        return Response({
            'charges': PeriodicChargeSerializer(charges, many=True).data,
        })

    def post(self, request):
        serializer = PeriodicChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        charge = serializer.save(created_by=request.user)
        return Response(
            {
                'message': 'شارژ جدید با موفقیت صادر شد.',
                'charge': PeriodicChargeSerializer(charge).data,
            },
            status=status.HTTP_201_CREATED,
        )
