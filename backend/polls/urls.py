from django.urls import path
from .views import (
    ManagerPollListCreateView,
    ManagerPollDetailView,
)

urlpatterns = [
    path("manager/polls/", ManagerPollListCreateView.as_view(), name="manager-polls"),
    path("manager/polls/<int:pk>/", ManagerPollDetailView.as_view(), name="manager-poll-detail"),
]