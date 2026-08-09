from django.urls import path
from .views import ManagerAmenityListCreateView, ManagerAmenityDetailView

urlpatterns = [
    path("manager/amenities/", ManagerAmenityListCreateView.as_view(), name="manager-amenities"),
    path("manager/amenities/<int:pk>/", ManagerAmenityDetailView.as_view(), name="manager-amenity-detail"),
]
