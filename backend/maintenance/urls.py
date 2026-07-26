from django.urls import path
from .views import ServiceRequestListCreateView

urlpatterns = [
    path('requests/', ServiceRequestListCreateView.as_view(), name='service-request-list'),
]