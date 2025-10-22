"""
Django settings for HMConveniencia PDV
"""

from pathlib import Path
from decouple import config


def _split_env_list(value):
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _host_to_origin(host):
    host = host.strip()
    if not host:
        return ""
    if host.startswith("http://") or host.startswith("https://"):
        return host
    return f"https://{host.lstrip('.')}"


BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY
SECRET_KEY = config(
    "SECRET_KEY", default="django-insecure-dev-key-change-in-production"
)
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = _split_env_list(
    config("ALLOWED_HOSTS", default="localhost,127.0.0.1")
)

# APPS
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    # Local
    "fiscal",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "hmconveniencia.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "hmconveniencia.wsgi.application"

# DATABASE
if config("DATABASE_URL", default=""):
    # Production (Render)
    import dj_database_url

    DATABASES = {"default": dj_database_url.config(default=config("DATABASE_URL"))}
    # Otimizações para PostgreSQL em produção
    DATABASES["default"]["CONN_MAX_AGE"] = 600  # Mantém conexão por 10 minutos
    DATABASES["default"]["OPTIONS"] = {
        "connect_timeout": 10,
    }
else:
    # Development (SQLite)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# PASSWORD VALIDATION
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# INTERNATIONALIZATION
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

# STATIC FILES
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# DEFAULT PRIMARY KEY
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS
default_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

extra_cors_origins = _split_env_list(config("CORS_ALLOWED_ORIGINS", default=""))
frontend_origin = config("FRONTEND_URL", default="").strip()
if frontend_origin:
    extra_cors_origins.append(frontend_origin)

CORS_ALLOWED_ORIGINS = list(dict.fromkeys(default_cors_origins + extra_cors_origins))
CORS_ALLOW_CREDENTIALS = True

csrf_trusted_origins = _split_env_list(config("CSRF_TRUSTED_ORIGINS", default=""))
if not csrf_trusted_origins and not DEBUG:
    csrf_trusted_origins = [
        origin
        for origin in (_host_to_origin(host) for host in ALLOWED_HOSTS)
        if origin and not origin.endswith("localhost") and "127.0.0.1" not in origin
    ]
CSRF_TRUSTED_ORIGINS = csrf_trusted_origins

# CACHE - Redis (Upstash) com fallback para LocMem
REDIS_URL = config("REDIS_URL", default=None)

if REDIS_URL:
    # Produção com Redis (Upstash)
    try:
        CACHES = {
            "default": {
                "BACKEND": "django_redis.cache.RedisCache",
                "LOCATION": REDIS_URL,
                "OPTIONS": {
                    "CLIENT_CLASS": "django_redis.client.DefaultClient",
                    "SERIALIZER": "django_redis.serializers.json.JSONSerializer",  # JSON em vez de pickle
                    "SOCKET_CONNECT_TIMEOUT": 5,
                    "SOCKET_TIMEOUT": 5,
                    "CONNECTION_POOL_KWARTS": {
                        "max_connections": 50,
                        "retry_on_timeout": True,
                    },
                    "IGNORE_EXCEPTIONS": True,  # Não quebra se Redis falhar
                },
                "KEY_PREFIX": "hmconv",
                "TIMEOUT": 300,  # 5 minutos padrão
            }
        }
    except Exception:
        # Fallback para LocMem se Redis falhar
        CACHES = {
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": "hmconveniencia-cache-fallback",
            }
        }
else:
    # Desenvolvimento - LocMemCache (memória local)
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "hmconveniencia-cache",
            "OPTIONS": {
                "MAX_ENTRIES": 1000,
            },
        }
    }

# REST FRAMEWORK
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,  # Otimizado para performance
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",  # Para Django Admin
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",  # Usuários não autenticados
        "user": "1000/hour",  # Usuários autenticados
    },
}
