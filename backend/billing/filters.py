import django_filters

from common.filter_utils import map_status, parse_filter_date
from .models import UnitCharge, UnitChargeStatus


STATUS_ALIASES = {
    'pending': UnitChargeStatus.PENDING,
    'پرداخت نشده': UnitChargeStatus.PENDING,
    'بدهی': UnitChargeStatus.PENDING,
    'معوق': UnitChargeStatus.PENDING,
    'paid': UnitChargeStatus.PAID,
    'پرداخت شده': UnitChargeStatus.PAID,
    'تسویه شده': UnitChargeStatus.PAID,
}


class UnitChargeReportFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(method='filter_status')
    created_after = django_filters.CharFilter(method='filter_created_after')
    created_before = django_filters.CharFilter(method='filter_created_before')
    min_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    max_amount = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')

    class Meta:
        model = UnitCharge
        fields = []

    def filter_status(self, queryset, name, value):
        return queryset.filter(status=map_status(value, STATUS_ALIASES, name))

    def filter_created_after(self, queryset, name, value):
        return queryset.filter(created_at__date__gte=parse_filter_date(value, name))

    def filter_created_before(self, queryset, name, value):
        return queryset.filter(created_at__date__lte=parse_filter_date(value, name))
