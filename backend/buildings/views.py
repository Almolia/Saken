from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Unit
from .serializers import UnitSerializer


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