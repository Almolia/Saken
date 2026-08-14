from django.urls import path
from .views import (
    ResidentAnnouncementListView,
    ManagerAnnouncementListCreateView,
    ManagerAnnouncementDetailView,
)

urlpatterns = [
    path("resident/announcements/", ResidentAnnouncementListView.as_view(), name="resident-announcements"),
    path("manager/announcements/", ManagerAnnouncementListCreateView.as_view(), name="manager-announcements"),
    path("manager/announcements/<int:pk>/", ManagerAnnouncementDetailView.as_view(), name="manager-announcement-detail"),
]