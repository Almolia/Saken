from django.urls import path
from .views import (
    ManagerPeriodicChargeDetailView,
    ManagerPeriodicChargeListView,
    ResidentPaymentHistoryView,
    ResidentPaymentView,
    ResidentPendingChargesView,
    ManagerFinancialSummaryView,
    ManagerChargeSearchListView,
)

urlpatterns = [
    path('manager/charges/', ManagerPeriodicChargeListView.as_view(), name='manager-charges'),
    path('manager/charges/search/', ManagerChargeSearchListView.as_view(), name='manager-charge-search'),
    path('manager/charges/<int:pk>/', ManagerPeriodicChargeDetailView.as_view(), name='manager-charge-detail'),
    path('manager/periodic-charges/', ManagerPeriodicChargeListView.as_view(), name='manager-periodic-charges'),
    path('billing/charges/', ManagerPeriodicChargeListView.as_view(), name='billing-charges'),
    path('resident/charges/pending/', ResidentPendingChargesView.as_view(), name='resident-pending-charges'),
    path('resident/charges/history/', ResidentPaymentHistoryView.as_view(), name='resident-payment-history'),
    path('resident/charges/pay/', ResidentPaymentView.as_view(), name='resident-pay-charges'),
    path('manager/reports/financial/summary/', ManagerFinancialSummaryView.as_view(), name='manager-financial-summary'),
]
