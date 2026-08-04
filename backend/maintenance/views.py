from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.constants import ServiceRequestMessages
from users.models import UserRole
from users.permissions import IsManagerOrAdmin, IsResident, IsServiceStaff
from .models import RequestStatus, ServiceRequest
from .serializers import (
    AssignServiceRequestSerializer,
    ManagerServiceRequestSerializer,
    ServiceRequestSerializer,
    StaffServiceRequestSerializer,
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


class ManagerServiceRequestAssignView(APIView):
    """Assigns, or reassigns, a service staff member to a service request."""
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

        # A finished job has a work report tied to whoever did it, so its owner
        # is frozen. Anything still open can be handed to a different member.
        if service_request.status == RequestStatus.COMPLETED:
            return Response(
                {'detail': ServiceRequestMessages.COMPLETED_REQUEST_NOT_ASSIGNABLE},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AssignServiceRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff_id = serializer.validated_data['staff_id']
        staff_user = User.objects.get(pk=staff_id)

        was_assigned = service_request.assigned_staff_id is not None

        service_request.assigned_staff = staff_user
        service_request.status = RequestStatus.ASSIGNED
        service_request.save(update_fields=['assigned_staff', 'status'])

        return Response({
            'message': (
                ServiceRequestMessages.REQUEST_REASSIGNED
                if was_assigned
                else ServiceRequestMessages.REQUEST_ASSIGNED
            ),
            'request': ManagerServiceRequestSerializer(service_request).data,
        })

class StaffServiceRequestListView(generics.ListAPIView):
    serializer_class = StaffServiceRequestSerializer
    permission_classes = [IsServiceStaff]

    def get_queryset(self):
        """Strictly filter to only return records assigned to the logged-in staff member."""
        return (
            ServiceRequest.objects.filter(assigned_staff=self.request.user)
            .select_related('resident')
            .prefetch_related('resident__units')
            .order_by('status', 'id')
        )


class StaffServiceRequestUpdateView(generics.UpdateAPIView):
    serializer_class = StaffServiceRequestSerializer
    permission_classes = [IsServiceStaff]
    http_method_names = ['patch', 'options']

    def get_queryset(self):
        """Ensure a staff member can only update requests assigned to them."""
        return ServiceRequest.objects.filter(assigned_staff=self.request.user)

    def perform_update(self, serializer):
        """Automatically transition status to 'Completed' when a work report is submitted."""
        work_report = serializer.validated_data.get('work_report', None)

        if work_report:
            serializer.save(status=RequestStatus.COMPLETED)
        else:
            serializer.save()