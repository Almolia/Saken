from django.urls import path
from .views import (
    ManagerServiceRequestAssignView,
    ManagerServiceRequestListView,
    ServiceRequestListCreateView,
)

urlpatterns = [
    path('requests/', ServiceRequestListCreateView.as_view(), name='service-request-list'),
    path('manager/requests/', ManagerServiceRequestListView.as_view(), name='manager-service-request-list'),
    path('manager/requests/<int:pk>/assign/', ManagerServiceRequestAssignView.as_view(), name='manager-service-request-assign'),
]
