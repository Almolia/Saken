from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count

from billing.services import SettlementError, process_request_settlement
from common.constants import ServiceRequestMessages, SettlementMessages
from users.permissions import IsManager, IsManagerOrAdmin, IsResident, IsServiceStaff
from .models import RequestStatus, ServiceRequest
from .serializers import (
    AssignServiceRequestSerializer,
    ManagerServiceRequestSerializer,
    ServiceRequestSerializer,
    SettleServiceRequestSerializer,
    StaffServiceRequestSerializer,
)


class ServiceRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = [IsResident]

    def get_queryset(self):
        return ServiceRequest.objects.filter(resident=self.request.user)

    def perform_create(self, serializer):
        serializer.save(resident=self.request.user)


class ManagerServiceRequestSummaryView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        counts = ServiceRequest.objects.values('status').annotate(total=Count('id'))
        summary = {item['status']: item['total'] for item in counts}
        for status_choice in RequestStatus.values:
            if status_choice not in summary:
                summary[status_choice] = 0
        return Response(summary)


class ManagerServiceRequestListView(generics.ListAPIView):
    permission_classes = [IsManager]
    serializer_class = ManagerServiceRequestSerializer
    filter_backends = [filters.SearchFilter]
    pagination_class = None
    # This endpoint powers both the operational manager view and the global
    # search in Service Reports. Include every textual value rendered by the
    # report table, including the secondary phone values and creation date.
    search_fields = [
        'status',
        'title',
        'description',
        'resident__full_name',
        'resident__phone',
        'resident__units__unit_number',
        'assigned_staff__full_name',
        'assigned_staff__phone',
        'created_at',
    ]

    # Managers scan this list newest-first so the freshest requests need no
    # scrolling; ?ordering=created_at flips it for working a backlog from the
    # oldest entry. The id tiebreak keeps the order stable for requests that
    # share a timestamp.
    ORDERINGS = {
        '-created_at': ('-created_at', '-id'),
        'created_at': ('created_at', 'id'),
    }
    DEFAULT_ORDERING = '-created_at'

    def get_queryset(self):
        queryset = ServiceRequest.objects.select_related(
            'resident', 'assigned_staff'
        ).prefetch_related('resident__units')

        # ?status=Pending narrows the list to one status. Matching case
        # -insensitively lets ?status=pending work as well as the capitalised
        # value the model stores; an unrecognised status simply matches
        # nothing, which the UI renders as its empty state.
        status_param = (self.request.query_params.get('status') or '').strip()
        if status_param:
            queryset = queryset.filter(status__iexact=status_param)

        ordering_param = (self.request.query_params.get('ordering') or '').strip()
        ordering = self.ORDERINGS.get(ordering_param, self.ORDERINGS[self.DEFAULT_ORDERING])

        return queryset.order_by(*ordering)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({'requests': serializer.data})


def _assign_staff_to_request(service_request, request_data):
    if service_request.status == RequestStatus.COMPLETED:
        return Response(
            {'detail': ServiceRequestMessages.COMPLETED_REQUEST_NOT_ASSIGNABLE},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = AssignServiceRequestSerializer(data=request_data)
    serializer.is_valid(raise_exception=True)

    staff_user = serializer.validated_data['assigned_staff']
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


class ManagerServiceRequestAssignView(APIView):
    permission_classes = [IsManager]

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
        return _assign_staff_to_request(service_request, request.data)


class ManagerServiceRequestUpdateView(APIView):
    permission_classes = [IsManager]

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
        return _assign_staff_to_request(service_request, request.data)

    def put(self, request, pk):
        return self.patch(request, pk)


class ManagerServiceRequestSettleView(APIView):
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
        return (
            ServiceRequest.objects.filter(assigned_staff=self.request.user)
            .select_related('resident')
            .prefetch_related('resident__units')
        )

    def perform_update(self, serializer):
        if 'work_report' not in serializer.validated_data:
            serializer.save()
            return

        work_report = (serializer.validated_data.get('work_report') or '').strip()

        if work_report:
            serializer.save(work_report=work_report, status=RequestStatus.COMPLETED)
        else:
            serializer.save(work_report=None, status=RequestStatus.ASSIGNED)
