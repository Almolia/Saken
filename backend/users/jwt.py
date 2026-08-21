from datetime import timedelta

from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework_simplejwt.tokens import RefreshToken


def create_token_pair_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh.set_exp(lifetime=timedelta(days=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS))
    refresh.access_token.set_exp(lifetime=timedelta(minutes=settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES))
    return str(refresh.access_token), str(refresh)


def set_auth_cookies(response, request, access_token, refresh_token):
    """
    Set JWT cookies. We intentionally do NOT set Domain explicitly (host-only cookie)
    because backend on Render cannot set a cookie for Vercel domain - browser would reject it.
    Host-only cookies work fine for cross-site with SameSite=None + Secure + CORS credentials.
    """
    response.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        access_token,
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        max_age=settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        refresh_token,
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        max_age=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60,
        path="/",
    )
    response.set_cookie(
        "csrftoken",
        get_token(request),
        httponly=False,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        max_age=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60,
        path="/",
    )
    return response


def clear_auth_cookies(response):
    """
    Properly clear auth cookies.

    Root cause of logout bug:
    Cookies were set with Secure=True, SameSite=None (for cross-site Vercel+Render)
    but delete_cookie was called only with path='/' without Secure/SameSite.
    Browsers require matching attributes for deletion to succeed, otherwise cookie stays.

    Fix:
    - Delete with matching Secure and SameSite attributes
    - Also try without them as fallback for old cookies
    - Also try with possible domains (in case some old cookies were set with domain)
    - Finally overwrite with expired cookie (Max-Age=0) as ultimate fallback

    We do NOT set Domain when creating cookies (host-only), but we try to clear
    both with and without domain to be safe for any legacy cookies.
    """
    cookie_names = [
        settings.JWT_ACCESS_COOKIE_NAME,
        settings.JWT_REFRESH_COOKIE_NAME,
        "csrftoken",
    ]

    # Possible domains that might have been used historically
    # None = host-only, plus any configured domains
    domains_to_try = [
        None,
        getattr(settings, "SESSION_COOKIE_DOMAIN", None),
        getattr(settings, "CSRF_COOKIE_DOMAIN", None),
    ]
    # Deduplicate
    seen = set()
    uniq_domains = []
    for d in domains_to_try:
        if d not in seen:
            seen.add(d)
            uniq_domains.append(d)

    for domain in uniq_domains:
        for name in cookie_names:
            # 1. Delete with matching Secure/SameSite (the critical fix)
            kwargs_matching = {
                "path": "/",
                "samesite": settings.JWT_COOKIE_SAMESITE,
                "secure": settings.JWT_COOKIE_SECURE,
            }
            if domain:
                kwargs_matching["domain"] = domain
            try:
                response.delete_cookie(name, **kwargs_matching)
            except Exception:
                pass

            # 2. Fallback: delete without Secure/SameSite (for old Lax cookies)
            kwargs_fallback = {"path": "/"}
            if domain:
                kwargs_fallback["domain"] = domain
            try:
                response.delete_cookie(name, **kwargs_fallback)
            except Exception:
                pass

    # 3. Ultimate fallback: overwrite with expired cookie using same attributes as set
    # Host-only version (primary)
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

    # 4. Also try expired cookie with domain if domain is configured (for legacy)
    for domain in uniq_domains:
        if not domain:
            continue
        try:
            response.set_cookie(
                settings.JWT_ACCESS_COOKIE_NAME,
                "",
                max_age=0,
                expires="Thu, 01 Jan 1970 00:00:00 GMT",
                path="/",
                domain=domain,
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
                domain=domain,
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
                domain=domain,
                secure=settings.JWT_COOKIE_SECURE,
                samesite=settings.JWT_COOKIE_SAMESITE,
                httponly=False,
            )
        except Exception:
            pass

    return response
