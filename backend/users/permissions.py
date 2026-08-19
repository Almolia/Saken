from common.constants import UserMessages
from rest_framework.permissions import BasePermission

from .models import UserRole


class IsManager(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.role in {UserRole.MANAGER, UserRole.ADMIN}
        )


class IsManagerOrAdmin(IsManager):
    pass


class IsAdminUserRole(BasePermission):
    message = UserMessages.ADMIN_ONLY_ROLE_CHANGE

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.role == UserRole.ADMIN
        )


class IsServiceStaff(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.role == UserRole.SERVICE_STAFF
        )


class IsResident(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.role == UserRole.RESIDENT
        )
