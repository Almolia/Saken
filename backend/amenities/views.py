from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from common.constants import AmenityMessages
from users.permissions import IsManagerOrAdmin
from .models import Amenity
from .serializers import AmenitySerializer, AmenityCreateSerializer, AmenityUpdateSerializer


class ManagerAmenityListCreateView(APIView):
    """
    GET: List all amenities (for managers and future resident access)
    POST: Create a new amenity (managers only)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        amenities = Amenity.objects.all().order_by("name")
        serializer = AmenitySerializer(amenities, many=True)
        return Response({"amenities": serializer.data})

    def post(self, request):
        # Only managers and admins can create amenities
        if not (request.user.role in {"manager", "admin"}):
            return Response(
                {"detail": "فقط مدیران می‌توانند امکان جدید اضافه کنند."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AmenityCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amenity = serializer.save()

        return Response(
            {
                "message": AmenityMessages.AMENITY_CREATED,
                "amenity": AmenitySerializer(amenity).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ManagerAmenityDetailView(APIView):
    """
    GET: Get single amenity details
    PATCH: Update an amenity (managers only)
    DELETE: Delete an amenity (managers only)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            amenity = Amenity.objects.get(pk=pk)
        except Amenity.DoesNotExist:
            return Response(
                {"detail": AmenityMessages.AMENITY_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AmenitySerializer(amenity)
        return Response(serializer.data)

    def patch(self, request, pk):
        # Only managers and admins can update amenities
        if not (request.user.role in {"manager", "admin"}):
            return Response(
                {"detail": "فقط مدیران می‌توانند امکانات را ویرایش کنند."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            amenity = Amenity.objects.get(pk=pk)
        except Amenity.DoesNotExist:
            return Response(
                {"detail": AmenityMessages.AMENITY_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AmenityUpdateSerializer(amenity, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        amenity = serializer.save()

        return Response(
            {
                "message": AmenityMessages.AMENITY_UPDATED,
                "amenity": AmenitySerializer(amenity).data,
            }
        )

    def delete(self, request, pk):
        # Only managers and admins can delete amenities
        if not (request.user.role in {"manager", "admin"}):
            return Response(
                {"detail": "فقط مدیران می‌توانند امکانات را حذف کنند."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            amenity = Amenity.objects.get(pk=pk)
        except Amenity.DoesNotExist:
            return Response(
                {"detail": AmenityMessages.AMENITY_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        amenity.delete()
        return Response({"message": AmenityMessages.AMENITY_DELETED})
