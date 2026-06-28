from django.urls import path

from .views import CurrentUserView, LoginView, LogoutView, ManagerBootstrapView, RegisterView, UserListView, UserStatusToggleView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('manager/bootstrap/', ManagerBootstrapView.as_view(), name='manager-bootstrap'),
    path('manager/users/', UserListView.as_view(), name='user-list'),
    path('manager/users/<int:pk>/status/', UserStatusToggleView.as_view(), name='user-status-toggle'),
]
