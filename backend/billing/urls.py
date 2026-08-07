from django.urls import path
from .views import ManagerPeriodicChargeListView

urlpatterns = [
    path('manager/charges/', ManagerPeriodicChargeListView.as_view(), name='manager-charges'),
    path('manager/periodic-charges/', ManagerPeriodicChargeListView.as_view(), name='manager-periodic-charges'),
    path('billing/charges/', ManagerPeriodicChargeListView.as_view(), name='billing-charges'),
]
