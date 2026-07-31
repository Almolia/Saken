from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.constants import ServiceRequestMessages
from users.models import UserRole
from users.permissions import IsManagerOrAdmin, IsResident
from .models import RequestStatus, ServiceRequest
from .serializers import (
    AssignServiceRequestSerializer,
    ManagerServiceRequestSerializer,
    ServiceRequestSerializer,
)

User = get_user_model()


class ServiceRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = [IsResident]

    def get_queryset(self):
        """Strictly filters and returns only the records where resident == request.user."""
        return ServiceRequest.objects.filter(resident=self.request.user)

    def perform_create(self, serializer):
        """Ensures the resident field is automatically set to the authenticated user."""
        serializer.save(resident=self.request.user)


class ManagerServiceRequestListView(APIView):
    """Returns all service requests for the Manager dashboard."""
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        requests = (
            ServiceRequest.objects.select_related('resident', 'assigned_staff')
            .order_by('status', 'id')
        )
        return Response({
            'requests': ManagerServiceRequestSerializer(requests, many=True).data,
        })


class ManagerServiceRequestDetailView(APIView):
    """Allows managers to update a specific service request."""
    permission_classes = [IsManagerOrAdmin]

    def patch(self, request, pk):
        try:
            service_request = ServiceRequest.objects.select_related(
                'resident', 'assigned_staff'
            ).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return Response(
                {'detail': ServiceRequestMessages.REQUEST_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ManagerServiceRequestUpdateSerializer(
            service_request,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        updated_request = serializer.save()

        return Response({
            'message': ServiceRequestMessages.REQUEST_UPDATED,
            'request': ManagerServiceRequestSerializer(updated_request).data,
        })


class ManagerServiceRequestAssignView(APIView):
    """Assigns a service staff member to a pending service request."""
    permission_classes = [IsManagerOrAdmin]

    def patch(self, request, pk):
        try:
            service_request = ServiceRequest.objects.select_related(
                'resident', 'assigned_staff'
            ).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return Response(
                {'detail': ServiceRequestMessages.REQUEST_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        if service_request.status != RequestStatus.PENDING:
            return Response(
                {'detail': ServiceRequestMessages.INVALID_STATUS_FOR_ASSIGNMENT},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AssignServiceRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff_id = serializer.validated_data['staff_id']
        staff_user = User.objects.get(pk=staff_id)

        service_request.assigned_staff = staff_user
        service_request.status = RequestStatus.ASSIGNED
        service_request.save(update_fields=['assigned_staff', 'status'])

        return Response({
            'message': ServiceRequestMessages.REQUEST_ASSIGNED,
            'request': ManagerServiceRequestSerializer(service_request).data,
        })
