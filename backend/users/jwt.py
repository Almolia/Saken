from datetime import timedelta

from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework_simplejwt.tokens import RefreshToken


def _get_cookie_domain():
    """
    Resolve which domain to use for auth cookies.
    We prioritize SESSION_COOKIE_DOMAIN, then CSRF_COOKIE_DOMAIN.
    If neither is set, we return None (host-only cookie).
    """
    return getattr(settings, "SESSION_COOKIE_DOMAIN", None) or getattr(
        settings, "CSRF_COOKIE_DOMAIN", None
    ) or None


def create_token_pair_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh.set_exp(lifetime=timedelta(days=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS))
    refresh.access_token.set_exp(lifetime=timedelta(minutes=settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES))
    return str(refresh.access_token), str(refresh)


def set_auth_cookies(response, request, access_token, refresh_token):
    """
    Set JWT cookies with attributes matching the security settings.
    Domain is set if SESSION_COOKIE_DOMAIN is configured (for cross-subdomain or
    production deployments on Vercel/Render).
    """
    domain = _get_cookie_domain()
    common_kwargs = dict(
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        path="/",
    )
    if domain:
        common_kwargs["domain"] = domain

    response.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        access_token,
        max_age=settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES * 60,
        **common_kwargs,
    )
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60,
        **common_kwargs,
    )
    # csrftoken is NOT httponly so frontend can read it
    csrf_kwargs = dict(
        httponly=False,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        path="/",
        max_age=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60,
    )
    if domain:
        csrf_kwargs["domain"] = domain

    response.set_cookie(
        "csrftoken",
        get_token(request),
        **csrf_kwargs,
    )
    return response


def clear_auth_cookies(response):
    """
    Properly clear auth cookies.
    Browsers require that delete_cookie uses the SAME attributes (path, domain,
    secure, samesite) as when the cookie was set, otherwise deletion silently fails.
    This was the root cause of the logout bug: cookies set with Secure/SameSite=None
    were not deleted because delete_cookie was called without those attributes.

    We delete with multiple variations to be safe:
    - with domain (if configured) and without
    - with matching samesite/secure and without (fallback for old cookies)
    - plus set an expired cookie as ultimate fallback
    """
    domain = _get_cookie_domain()

    # All possible domains we should try to clear
    domains_to_try = [None, domain, settings.CSRF_COOKIE_DOMAIN, settings.SESSION_COOKIE_DOMAIN]
    # Deduplicate while preserving order
    seen = set()
    uniq_domains = []
    for d in domains_to_try:
        if d not in seen:
            seen.add(d)
            uniq_domains.append(d)

    cookie_names = [
        settings.JWT_ACCESS_COOKIE_NAME,
        settings.JWT_REFRESH_COOKIE_NAME,
        "csrftoken",
    ]

    for dom in uniq_domains:
        # Delete with matching secure/samesite
        for name in cookie_names:
            kwargs = {
                "path": "/",
                "samesite": settings.JWT_COOKIE_SAMESITE,
                "secure": settings.JWT_COOKIE_SECURE,
            }
            if dom:
                kwargs["domain"] = dom
            try:
                response.delete_cookie(name, **kwargs)
            except Exception:
                pass

            # Fallback: delete without samesite/secure (for cookies set before config change)
            fallback_kwargs = {"path": "/"}
            if dom:
                fallback_kwargs["domain"] = dom
            try:
                response.delete_cookie(name, **fallback_kwargs)
            except Exception:
                pass

    # Ultimate fallback: overwrite with expired cookie using same attributes as set
    # This ensures even if delete_cookie fails, browser gets an expired value
    expired_common = {
        "max_age": 0,
        "expires": "Thu, 01 Jan 1970 00:00:00 GMT",
        "path": "/",
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
    }
    if domain:
        expired_common["domain"] = domain

    response.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        "",
        httponly=True,
        **expired_common,
    )
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        "",
        httponly=True,
        **expired_common,
    )
    csrf_expired = {**expired_common, "httponly": False}
    response.set_cookie("csrftoken", "", **csrf_expired)

    # Also clear without domain as extra safety for host-only cookies
    response.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        "",
        max_age=0,
        expires="Thu, 01 Jan 1970 00:00:00 GMT",
        path="/",
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        httponly=True,
    )
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        "",
        max_age=0,
        expires="Thu, 01 Jan 1970 00:00:00 GMT",
        path="/",
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        httponly=True,
    )
    response.set_cookie(
        "csrftoken",
        "",
        max_age=0,
        expires="Thu, 01 Jan 1970 00:00:00 GMT",
        path="/",
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        httponly=False,
    )

    return response
