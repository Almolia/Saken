from django.contrib.auth import get_user_model
from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count

from billing.services import SettlementError, process_request_settlement
from common.constants import ServiceRequestMessages, SettlementMessages
from users.models import UserRole
from users.permissions import IsManagerOrAdmin, IsResident, IsServiceStaff
from .models import RequestStatus, ServiceRequest
from .serializers import (
    AssignServiceRequestSerializer,
    ManagerServiceRequestSerializer,
    ServiceRequestSerializer,
    SettleServiceRequestSerializer,
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

class ManagerServiceRequestSummaryView(APIView):
    """Returns a efficient aggregate count of requests grouped by status."""
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        # Executes a single, fast SQL GROUP BY query without loading objects into memory
        counts = ServiceRequest.objects.values('status').annotate(total=Count('id'))

        # Format into a clean dictionary: {"Pending": 5, "Completed": 3, ...}
        summary = {item['status']: item['total'] for item in counts}

        # Ensure all statuses are present in the payload, even if their count is 0
        for status_choice in RequestStatus.values:
            if status_choice not in summary:
                summary[status_choice] = 0

        return Response(summary)

class ManagerServiceRequestListView(generics.ListAPIView):
    """Returns all service requests for the Manager dashboard with multi-term search."""
    permission_classes = [IsManagerOrAdmin]
    serializer_class = ManagerServiceRequestSerializer
    filter_backends = [filters.SearchFilter]

    search_fields = [
        'status',
        'resident__full_name',
        'resident__units__unit_number',
        'assigned_staff__full_name'
    ]

    def get_queryset(self):
        return (
            ServiceRequest.objects.select_related('resident', 'assigned_staff')
            .order_by('status', 'id')
        )

    def list(self, request, *args, **kwargs):
        # Overridden to maintain the existing {'requests': [...]} dictionary structure.
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({'requests': serializer.data})

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

class ManagerServiceRequestSettleView(APIView):
    """Settles the cost of a completed service request."""
    permission_classes = [IsManagerOrAdmin]

    def post(self, request, pk):
        try:
            service_request = ServiceRequest.objects.get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return Response(
                {'detail': ServiceRequestMessages.REQUEST_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        if service_request.status != RequestStatus.COMPLETED:
            return Response(
                {'detail': SettlementMessages.REQUEST_NOT_COMPLETED},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if service_request.is_settled:
            return Response(
                {'detail': SettlementMessages.ALREADY_SETTLED},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SettleServiceRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # The service re-checks these guards under a row lock, so two
            # concurrent calls cannot both get past the checks above.
            settled_request = process_request_settlement(
                service_request.pk,
                serializer.validated_data['cost'],
                serializer.validated_data['payment_method'],
            )
        except SettlementError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        settled_request = ServiceRequest.objects.select_related(
            'resident', 'assigned_staff'
        ).get(pk=settled_request.pk)

        return Response({
            'message': SettlementMessages.SETTLEMENT_SUCCESS,
            'request': ManagerServiceRequestSerializer(settled_request).data,
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
        return (
            ServiceRequest.objects.filter(assigned_staff=self.request.user)
            .select_related('resident')
            .prefetch_related('resident__units')
        )

    def perform_update(self, serializer):
        """Writing a report completes the request; clearing it reopens the request.

        A report can be rewritten freely while it stands. Removing it has to move
        the status back to Assigned, because "Completed" with nothing to show for
        it is a state the resident and manager views cannot render meaningfully.
        """
        if 'work_report' not in serializer.validated_data:
            serializer.save()
            return

        work_report = (serializer.validated_data.get('work_report') or '').strip()

        if work_report:
            serializer.save(work_report=work_report, status=RequestStatus.COMPLETED)
        else:
            serializer.save(work_report=None, status=RequestStatus.ASSIGNED)