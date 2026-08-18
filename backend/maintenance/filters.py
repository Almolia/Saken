import django_filters

from common.filter_utils import map_status, parse_filter_date
from .models import RequestStatus, ServiceRequest


STATUS_ALIASES = {
    'pending': RequestStatus.PENDING,
    'در انتظار': RequestStatus.PENDING,
    'در انتظار بررسی': RequestStatus.PENDING,
    'assigned': RequestStatus.ASSIGNED,
    'ارجاع شده': RequestStatus.ASSIGNED,
    'تخصیص یافته': RequestStatus.ASSIGNED,
    'completed': RequestStatus.COMPLETED,
    'تکمیل شده': RequestStatus.COMPLETED,
    'انجام شده': RequestStatus.COMPLETED,
}


class ServiceRequestReportFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(method='filter_status')
    created_after = django_filters.CharFilter(method='filter_created_after')
    created_before = django_filters.CharFilter(method='filter_created_before')

    class Meta:
        model = ServiceRequest
        fields = []

    def filter_status(self, queryset, name, value):
        return queryset.filter(status=map_status(value, STATUS_ALIASES, name))

    def filter_created_after(self, queryset, name, value):
        return queryset.filter(created_at__date__gte=parse_filter_date(value, name))

    def filter_created_before(self, queryset, name, value):
        return queryset.filter(created_at__date__lte=parse_filter_date(value, name))
