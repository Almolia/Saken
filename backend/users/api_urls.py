from django.urls import path

from .views import (
    AdminPasswordChangeView,
    AdminProfileUpdateView,
    CurrentUserView,
    LoginView,
    LogoutView,
    RegisterView,
    ServiceStaffListView,
    ServiceStaffPasswordChangeView,
    ServiceStaffProfileUpdateView,
    UserListView,
    UserRoleUpdateView,
    UserStatusUpdateView,
)

app_name = "users"

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", CurrentUserView.as_view(), name="current-user"),
    path("auth/admin/profile/", AdminProfileUpdateView.as_view(), name="admin-profile-update"),
    path("auth/admin/change-password/", AdminPasswordChangeView.as_view(), name="admin-change-password"),
    path("auth/service-staff/profile/", ServiceStaffProfileUpdateView.as_view(), name="service-staff-profile-update"),
    path("auth/service-staff/change-password/", ServiceStaffPasswordChangeView.as_view(), name="service-staff-change-password"),
    path("manager/users/", UserListView.as_view(), name="user-list"),
    path("manager/users/<int:pk>/role/", UserRoleUpdateView.as_view(), name="user-role-update"),
    path("manager/users/<int:pk>/status/", UserStatusUpdateView.as_view(), name="user-status-update"),
    path("manager/service-staff/", ServiceStaffListView.as_view(), name="service-staff-list"),
]
