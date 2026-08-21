from django.urls import path

from .views import (
    ManagerPollListCreateView, ManagerPollDetailView, ResidentPollVoteView, ResidentPollListView,
    ManagerPollResultsView, ResidentPollResultsView
)

urlpatterns = [
    path("manager/polls/", ManagerPollListCreateView.as_view(), name="manager-polls"),
    path("manager/polls/<int:pk>/", ManagerPollDetailView.as_view(), name="manager-poll-detail"),
    path("manager/polls/<int:pk>/results/", ManagerPollResultsView.as_view(), name="manager-poll-results"),

    path("resident/polls/", ResidentPollListView.as_view(), name="resident-polls"),
    path("resident/polls/<int:pk>/vote/", ResidentPollVoteView.as_view(), name="resident-poll-vote"),
    path("resident/polls/<int:pk>/results/", ResidentPollResultsView.as_view(), name="resident-poll-results"),
]
