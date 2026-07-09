from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from common.constants import UnitMessages
from users.permissions import IsManagerOrAdmin
from .models import Unit
from .serializers import ManagerUnitSerializer, UnitAssignSerializer, UnitSerializer


class MyUnitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        units = user.units.all()
        if not units.exists():
            return Response(
                {"detail": "No unit assigned to this user."},
                status=status.HTTP_404_NOT_FOUND
            )
        if units.count() == 1:
            serializer = UnitSerializer(units.first())
        else:
            serializer = UnitSerializer(units, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)


class ManagerUnitListCreateView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        units = Unit.objects.select_related("owner", "building").order_by("floor", "unit_number")
        return Response({"units": ManagerUnitSerializer(units, many=True).data})

    def post(self, request):
        serializer = ManagerUnitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        unit = serializer.save()
        return Response(
            {
                "message": UnitMessages.UNIT_CREATED,
                "unit": ManagerUnitSerializer(unit).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ManagerUnitAssignView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def patch(self, request, pk):
        try:
            unit = Unit.objects.select_related("owner", "building").get(pk=pk)
        except Unit.DoesNotExist:
            return Response(
                {"detail": UnitMessages.UNIT_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UnitAssignSerializer(unit, data=request.data)
        serializer.is_valid(raise_exception=True)
        unit = serializer.save()
        return Response(
            {
                "message": UnitMessages.UNIT_ASSIGNED,
                "unit": ManagerUnitSerializer(unit).data,
            }
        )