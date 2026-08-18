from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from common.constants import BuildingMessages, UnitMessages
from users.permissions import IsManagerOrAdmin
from .models import Unit, Building
from .serializers import (
    ManagerUnitSerializer,
    UnitAssignSerializer,
    UnitSerializer,
    ManagerBuildingSerializer,
    ManagerUnitUpdateSerializer
)

class MyUnitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        units = user.units.all()
        if not units.exists():
            return Response(
                {"detail": UnitMessages.NO_UNIT_ASSIGNED},
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

class ManagerBuildingDetailView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get_object(self, pk=None):
        if pk:
            return Building.objects.filter(pk=pk).first()
        return Building.objects.first()  # Fallback for generic /api/manager/building/ route

    def get(self, request, pk=None):
        building = self.get_object(pk)
        if not building:
            return Response(
                {"detail": BuildingMessages.BUILDING_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ManagerBuildingSerializer(building).data)

    def post(self, request, pk=None):
        """
        Registers the building record. The app models a single building, so this
        is only available while none exists — otherwise the settings form would
        silently create a second one the rest of the app never reads.
        """
        if Building.objects.exists():
            return Response(
                {"detail": BuildingMessages.BUILDING_ALREADY_EXISTS},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ManagerBuildingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        building = serializer.save()
        return Response(
            {
                "message": BuildingMessages.BUILDING_CREATED,
                "building": ManagerBuildingSerializer(building).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, pk=None):
        building = self.get_object(pk)
        if not building:
            return Response(
                {"detail": BuildingMessages.BUILDING_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ManagerBuildingSerializer(building, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "message": BuildingMessages.BUILDING_UPDATED,
                "building": serializer.data,
            }
        )

class ManagerUnitDetailView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get_object(self, pk):
        try:
            return Unit.objects.get(pk=pk)
        except Unit.DoesNotExist:
            return None

    def get(self, request, pk):
        unit = self.get_object(pk)
        if not unit:
            return Response({"detail": UnitMessages.UNIT_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        return Response(ManagerUnitSerializer(unit).data)

    def patch(self, request, pk):
        unit = self.get_object(pk)
        if not unit:
            return Response({"detail": UnitMessages.UNIT_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        # Safely handle the specific "resident_id: null" payload requirement
        data = request.data.copy()
        if 'resident_id' in data:
            data['owner'] = data.pop('resident_id')

        serializer = ManagerUnitUpdateSerializer(unit, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "message": UnitMessages.UNIT_UPDATED,
                "unit": ManagerUnitSerializer(unit).data,
            }
        )

    def delete(self, request, pk):
        try:
            unit = Unit.objects.get(pk=pk)
        except Unit.DoesNotExist:
            return Response(
                {"detail": UnitMessages.UNIT_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        unit.delete()
        return Response({"message": UnitMessages.UNIT_DELETED})

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
        message = UnitMessages.UNIT_ASSIGNED if unit.owner else UnitMessages.UNIT_UNASSIGNED
        return Response(
            {
                "message": message,
                "unit": ManagerUnitSerializer(unit).data,
            }
        )