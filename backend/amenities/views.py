from datetime import datetime, time
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from common.constants import AmenityMessages
from users.permissions import IsManagerOrAdmin, IsResident
from .models import Amenity, Reservation, ReservationStatus
from .serializers import (
    AmenitySerializer,
    AmenityCreateSerializer,
    AmenityUpdateSerializer,
    ReservationSerializer,
    ReservationCreateSerializer,
    ReservationUpdateSerializer,
)
from .services import (
    create_reservation,
    cancel_reservation,
    get_amenity_slots,
    cancel_reservation_with_validation,
)


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


class AmenityListView(APIView):
    """
    GET: List active amenities (or all if manager/admin).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if getattr(request.user, "role", None) == "resident":
            amenities = Amenity.objects.filter(is_active=True).order_by("name")
        else:
            amenities = Amenity.objects.all().order_by("name")
        serializer = AmenitySerializer(amenities, many=True)
        return Response({"amenities": serializer.data})


class AmenitySlotsView(APIView):
    """
    GET: Fetch existing active reservations and time slots for a specific amenity on a specific day.
    URL: /api/amenities/<id>/slots/?date=YYYY-MM-DD
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, id=None, pk=None):
        amenity_id = id or pk
        try:
            amenity = Amenity.objects.get(pk=amenity_id)
        except Amenity.DoesNotExist:
            return Response(
                {"detail": AmenityMessages.AMENITY_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        date_str = request.query_params.get("date")
        if not date_str:
            target_date = timezone.localtime(timezone.now()).date()
        else:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"detail": "فرمت تاریخ نامعتبر است. فرمت صحیح YYYY-MM-DD می‌باشد."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        data = get_amenity_slots(amenity, target_date)
        return Response(data, status=status.HTTP_200_OK)


class ResidentReservationListCreateView(APIView):
    """
    GET: List current resident's reservations.
    POST: Create a booking for an amenity.
    """

    permission_classes = [IsResident]

    def get(self, request):
        now = timezone.now()
        reservations = (
            Reservation.objects.select_related("amenity", "resident")
            .filter(resident=request.user)
            .order_by("start_time", "-id")
        )
        serializer = ReservationSerializer(reservations, many=True)
        return Response({"reservations": serializer.data})

    def post(self, request):
        serializer = ReservationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        reservation = create_reservation(
            resident=request.user,
            amenity_id=validated["amenity"].id,
            start_time=validated["start_time"],
            end_time=validated["end_time"],
        )

        return Response(
            {
                "message": AmenityMessages.RESERVATION_CREATED,
                "reservation": ReservationSerializer(reservation).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ResidentReservationDetailView(APIView):
    """
    GET/DELETE/PATCH resident's own reservation.
    """

    permission_classes = [IsResident]

    def get(self, request, pk):
        try:
            reservation = (
                Reservation.objects.select_related("amenity", "resident")
                .get(pk=pk, resident=request.user)
            )
        except Reservation.DoesNotExist:
            return Response(
                {"detail": AmenityMessages.RESERVATION_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

    def patch(self, request, pk):
        """
                Update reservation status to Canceled with validation:
                - Resident must own the reservation
                - Reservation must be in the future (start_time > now)
                """
        try:
            reservation = (
                Reservation.objects.select_related("amenity", "resident")
                .get(pk=pk, resident=request.user)
            )
        except Reservation.DoesNotExist:
            return Response(
                {"detail": AmenityMessages.RESERVATION_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate using the serializer
        serializer = ReservationUpdateSerializer(
            reservation,
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        # Perform the cancellation with validation
        updated_reservation = cancel_reservation_with_validation(
            reservation=reservation,
            user=request.user
        )

        return Response(
            {
                "message": AmenityMessages.RESERVATION_CANCELED,
                "reservation": ReservationSerializer(updated_reservation).data,
            }
        )

    def delete(self, request, pk):
        """
        Original DELETE behavior - cancels the reservation.
        """
        reservation = cancel_reservation(reservation_id=pk, user=request.user)
        return Response(
            {
                "message": AmenityMessages.RESERVATION_CANCELED,
                "reservation": ReservationSerializer(reservation).data,
            }
        )


class ResidentReservationCancelView(APIView):
    """
    POST: Cancel resident's reservation.
    """

    permission_classes = [IsResident]

    def post(self, request, pk):
        reservation = cancel_reservation(reservation_id=pk, user=request.user)
        return Response(
            {
                "message": AmenityMessages.RESERVATION_CANCELED,
                "reservation": ReservationSerializer(reservation).data,
            }
        )


class ManagerReservationListView(APIView):
    """
    GET: List all reservations (for manager/admin).
    """

    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        queryset = Reservation.objects.select_related("amenity", "resident").all()
        amenity_id = request.query_params.get("amenity")
        if amenity_id:
            queryset = queryset.filter(amenity_id=amenity_id)

        date_str = request.query_params.get("date")
        if date_str:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                tz = timezone.get_current_timezone()
                day_start = timezone.make_aware(datetime.combine(target_date, time.min), tz)
                day_end = timezone.make_aware(datetime.combine(target_date, time.max), tz)
                queryset = queryset.filter(start_time__lt=day_end, end_time__gt=day_start)
            except ValueError:
                pass

        reservations = queryset.order_by("-start_time", "-id")
        serializer = ReservationSerializer(reservations, many=True)
        return Response({"reservations": serializer.data})