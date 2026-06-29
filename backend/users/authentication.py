from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.settings import api_settings


class CookieJWTAuthentication(JWTAuthentication):
    """
    JWT authentication for HttpOnly-cookie based auth.

    Why this custom behavior is necessary:
    DRF/SimpleJWT normally raises `InvalidToken` as soon as it sees an invalid
    token. That is correct for Authorization headers, but it is painful for
    cookie auth because browsers keep sending stale/expired cookies to every
    endpoint, including public endpoints like /auth/login/ and /auth/register/.

    Therefore:
    - Invalid Authorization headers still raise 401 normally.
    - Missing/invalid access-token cookies are treated as unauthenticated.

    Result: an expired/stale cookie no longer blocks login with
    "Given token not valid for any token type".
    """

    def authenticate(self, request):
        header = self.get_header(request)

        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token

        raw_token = request.COOKIES.get(settings.JWT_ACCESS_COOKIE_NAME)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except InvalidToken:
            return None

        return self.get_user(validated_token), validated_token

    def authenticate_header(self, request):
        return api_settings.AUTH_HEADER_TYPES[0]
