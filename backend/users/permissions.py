from rest_framework.permissions import BasePermission

from common.constants import UserMessages
from .models import UserRole


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.role in {UserRole.MANAGER, UserRole.ADMIN}
        )


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
