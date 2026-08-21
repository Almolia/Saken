from django.urls import path

from .views import (
    ManagerPollListCreateView, ManagerPollDetailView, ResidentPollVoteView, ResidentPollListView,
)

urlpatterns = [
    path("manager/polls/", ManagerPollListCreateView.as_view(), name="manager-polls"),
    path("manager/polls/<int:pk>/", ManagerPollDetailView.as_view(), name="manager-poll-detail"),
    path("resident/polls/", ResidentPollListView.as_view(), name="resident-polls"),
    path("resident/polls/<int:pk>/vote/", ResidentPollVoteView.as_view(), name="resident-poll-vote"),
]
