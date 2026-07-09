import os
from pathlib import Path
from urllib.parse import urlparse

import dj_database_url

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

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-@y6s=5q57-ign@rp70hkf34y1yu4tt!esk6-!b+fmwgu1410*)",
)
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = ["*"]

frontend_local_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
frontend_codespaces_origin = build_codespaces_origin(5173)
frontend_extra_origins = get_env_list("FRONTEND_EXTRA_ORIGINS")
frontend_origins = unique(frontend_local_origins + [frontend_codespaces_origin] + frontend_extra_origins)

CORS_ALLOW_ALL_ORIGINS = True
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
    "rest_framework",
]

LOCAL_APPS = [
    "users",
    "billing",
    "maintenance",
    "buildings",
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

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "fa-ir"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
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
