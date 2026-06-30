from django.conf import settings
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from common.constants import UserMessages
from .jwt import clear_auth_cookies, create_token_pair_for_user, set_auth_cookies
from .models import User, UserRole


def build_auth_success_response(*, request, user, message):
    access_token, refresh_token = create_token_pair_for_user(user)
    response = Response(
        {
            "message": message,
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "username": user.username,
                "phone": user.phone,
                "national_id": user.national_id,
                "role": user.role,
            },
        }
    )
    return set_auth_cookies(response, request, access_token, refresh_token)


def logout_response(request):
    refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except (TokenError, AttributeError):
            pass

    response = Response({"message": UserMessages.LOGOUT_SUCCESS})
    return clear_auth_cookies(response)


def get_user_stats():
    users = User.objects.order_by("-date_joined")
    return users, {
        "total": users.count(),
        "managers": users.filter(role=UserRole.MANAGER).count(),
        "residents": users.filter(role=UserRole.RESIDENT).count(),
    }
