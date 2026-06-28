from rest_framework.permissions import BasePermission

from .models import UserRole


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and not user.is_disabled
            and user.role in {UserRole.MANAGER, UserRole.ADMIN}
        )
