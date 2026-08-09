from django.urls import path
from .views import (
    ManagerAmenityListCreateView,
    ManagerAmenityDetailView,
    AmenityListView,
    AmenitySlotsView,
    ResidentReservationListCreateView,
    ResidentReservationDetailView,
    ResidentReservationCancelView,
    ManagerReservationListView,
)

urlpatterns = [
    path("manager/amenities/", ManagerAmenityListCreateView.as_view(), name="manager-amenities"),
    path("manager/amenities/<int:pk>/", ManagerAmenityDetailView.as_view(), name="manager-amenity-detail"),
    path("amenities/", AmenityListView.as_view(), name="amenities-list"),
    path("amenities/<int:id>/slots/", AmenitySlotsView.as_view(), name="amenity-slots-id"),
    path("amenities/<int:pk>/slots/", AmenitySlotsView.as_view(), name="amenity-slots"),
    path("resident/amenities/", AmenityListView.as_view(), name="resident-amenities"),
    path("resident/reservations/", ResidentReservationListCreateView.as_view(), name="resident-reservations"),
    path("resident/reservations/<int:pk>/", ResidentReservationDetailView.as_view(), name="resident-reservation-detail"),
    path("resident/reservations/<int:pk>/cancel/", ResidentReservationCancelView.as_view(), name="resident-reservation-cancel"),
    path("manager/reservations/", ManagerReservationListView.as_view(), name="manager-reservations"),
]
