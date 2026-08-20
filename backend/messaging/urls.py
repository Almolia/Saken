from django.urls import path

from .views import (
    DirectMessageView,
    ManagerBroadcastView,
    ManagerMessageDetailView,
    ManagerMessageListView,
    ManagerMessageReadView,
    MessageRecipientsView,
    ResidentMessageDetailView,
    ResidentMessageListCreateView,
    ResidentMessageReadView,
    ResidentUnreadCountView,
)

urlpatterns = [
    # Direct message endpoints
    path(
        "messages/recipients/",
        MessageRecipientsView.as_view(),
        name="message-recipients",
    ),
    path(
        "messages/direct/",
        DirectMessageView.as_view(),
        name="message-direct",
    ),
    # Manager messaging endpoints
    path(
        "manager/messages/broadcast/",
        ManagerBroadcastView.as_view(),
        name="manager-message-broadcast",
    ),
    path(
        "manager/messages/",
        ManagerMessageListView.as_view(),
        name="manager-messages",
    ),
    path(
        "manager/messages/<int:pk>/read/",
        ManagerMessageReadView.as_view(),
        name="manager-message-read",
    ),
    path(
        "manager/messages/<int:pk>/",
        ManagerMessageDetailView.as_view(),
        name="manager-message-detail",
    ),
    # Resident messaging endpoints
    path(
        "resident/messages/unread_count/",
        ResidentUnreadCountView.as_view(),
        name="resident-messages-unread-count",
    ),
    path(
        "resident/messages/",
        ResidentMessageListCreateView.as_view(),
        name="resident-messages",
    ),
    path(
        "resident/messages/<int:pk>/read/",
        ResidentMessageReadView.as_view(),
        name="resident-message-read",
    ),
    path(
        "resident/messages/<int:pk>/",
        ResidentMessageDetailView.as_view(),
        name="resident-message-detail",
    ),
]
