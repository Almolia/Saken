import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

def get_env_list(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]

def build_codespaces_origin(port):
    codespace_name = os.getenv("CODESPACE_NAME", "").strip()
    forwarding_domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "").strip()
    if not codespace_name or not forwarding_domain:
        return ""
    return f"https://{codespace_name}-{port}.{forwarding_domain}"

def unique(values):
    seen = set()
    result = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result

DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"
IS_TESTING = "test" in sys.argv

# SECURITY: the secret key must come from the environment. A fallback value is
# only tolerated for local development (DEBUG=True) and the test runner, and it
# is clearly marked as insecure. Production (DEBUG=False) refuses to boot
# without a real DJANGO_SECRET_KEY instead of silently signing sessions/JWTs
# with a key that is public on GitHub.
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "").strip()
if not SECRET_KEY:
    if DEBUG or IS_TESTING:
        SECRET_KEY = "django-insecure-dev-only-key-do-not-use-in-production"
    else:
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY environment variable is required when DJANGO_DEBUG=False."
        )

# SECURITY: never accept requests for arbitrary Host headers. The list is
# built from the DJANGO_ALLOWED_HOSTS env var plus safe, known defaults:
# localhost for development, the Render hostname the backend is deployed on
# (Render injects RENDER_EXTERNAL_HOSTNAME automatically) and the GitHub
# Codespaces forwarded host when running in a codespace.
def build_codespaces_host(port):
    codespace_name = os.getenv("CODESPACE_NAME", "").strip()
    forwarding_domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "").strip()
    if not codespace_name or not forwarding_domain:
        return ""
    return f"{codespace_name}-{port}.{forwarding_domain}"


ALLOWED_HOSTS = unique(
    get_env_list("DJANGO_ALLOWED_HOSTS")
    + ["localhost", "127.0.0.1", "[::1]"]
    + [os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip()]
    + [".onrender.com"]
    + [build_codespaces_host(8000)]
)

frontend_local_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
frontend_codespaces_origin = build_codespaces_origin(5173)
frontend_extra_origins = get_env_list("FRONTEND_EXTRA_ORIGINS")
frontend_origins = unique(frontend_local_origins + [frontend_codespaces_origin] + frontend_extra_origins)

# SECURITY: do NOT allow every origin. Only the known frontend origins may
# talk to the API with credentials: localhost dev servers, the GitHub
# Codespaces frontend, anything listed in FRONTEND_EXTRA_ORIGINS /
# CORS_ALLOWED_ORIGINS env vars, and the deployed frontend on Vercel
# (matched by regex so no frontend env change is required).
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = unique(frontend_origins + get_env_list("CORS_ALLOWED_ORIGINS"))
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$",
    r"^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.onrender\.com$",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
CSRF_TRUSTED_ORIGINS = unique(
    get_env_list("CSRF_TRUSTED_ORIGINS")
    + frontend_origins
    + ["https://*.vercel.app", "https://*.onrender.com"]
)

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "corsheaders",
    "django_filters",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
]

LOCAL_APPS = [
    "users",
    "billing",
    "maintenance",
    "buildings",
    "amenities",
    "announcements",
    "messaging",
    "polls",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# SECURITY: enforce Django's standard password strength rules. These run both
# through the DRF serializers (users.validators.validate_password_strength
# calls django.contrib.auth.password_validation.validate_password) and in the
# Django admin / management commands.
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "fa-ir"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# Test workers do not run collectstatic and therefore have no STATIC_ROOT yet.
# Auto-refresh makes WhiteNoise use finders instead of scanning that generated
# directory, avoiding one warning per parallel worker without creating files.
WHITENOISE_AUTOREFRESH = DEBUG or "test" in sys.argv
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "users.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

JWT_ACCESS_TOKEN_LIFETIME_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", "60"))
JWT_REFRESH_TOKEN_LIFETIME_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_LIFETIME_DAYS", "7"))
JWT_ACCESS_COOKIE_NAME = os.getenv("JWT_ACCESS_COOKIE_NAME", "saken_access_token")
JWT_REFRESH_COOKIE_NAME = os.getenv("JWT_REFRESH_COOKIE_NAME", "saken_refresh_token")
JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "False").lower() == "true"
JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")

if os.getenv("CODESPACE_NAME"):
    JWT_COOKIE_SECURE = True
    if "JWT_COOKIE_SAMESITE" not in os.environ:
        JWT_COOKIE_SAMESITE = "None"

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

if JWT_COOKIE_SAMESITE.lower() == "none":
    SESSION_COOKIE_SAMESITE = "None"
    CSRF_COOKIE_SAMESITE = "None"

SESSION_COOKIE_SECURE = JWT_COOKIE_SECURE
CSRF_COOKIE_SECURE = JWT_COOKIE_SECURE

CSRF_COOKIE_DOMAIN = os.getenv("CSRF_COOKIE_DOMAIN") or None
SESSION_COOKIE_DOMAIN = os.getenv("SESSION_COOKIE_DOMAIN") or None

frontend_app_url = os.getenv("FRONTEND_APP_URL", "").strip()
if frontend_app_url:
    parsed_frontend_url = urlparse(frontend_app_url)
    if (
        parsed_frontend_url.hostname
        and "localhost" not in parsed_frontend_url.hostname
        and parsed_frontend_url.hostname != "127.0.0.1"
    ):
        cookie_domain = os.getenv("AUTH_COOKIE_DOMAIN", parsed_frontend_url.hostname).strip()
        SESSION_COOKIE_DOMAIN = SESSION_COOKIE_DOMAIN or cookie_domain
        CSRF_COOKIE_DOMAIN = CSRF_COOKIE_DOMAIN or cookie_domain

# --- SimpleJWT settings ---
# Enable token blacklist for proper logout
from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=JWT_ACCESS_TOKEN_LIFETIME_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=JWT_REFRESH_TOKEN_LIFETIME_DAYS),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --- Test optimizations ---
# When running `manage.py test`, use a fast hasher to avoid PBKDF2 overhead.
# This is the single biggest win for test speed (4 min -> <1 min).
# Also use in-memory cache and disable unnecessary middleware checks.
if "test" in sys.argv:
    PASSWORD_HASHERS = [
        "django.contrib.auth.hashers.MD5PasswordHasher",
    ]
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
    # Speed up test DB creation by not hashing too much and using faster storage
    # Silence whitenoise warnings already handled above
