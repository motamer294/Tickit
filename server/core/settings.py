import os
from pathlib import Path
import environ
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(
    DEBUG=(bool, False)
)

environ.Env.read_env(os.path.join(BASE_DIR, '.env'))



#SECRET_KEY = env('SECRET_KEY')
SECRET_KEY = 'django-insecure-test-key-just-for-debugging'
DEBUG = env('DEBUG')

ALLOWED_HOSTS = ['*']

# ============================================
# Nginx Reverse Proxy Configuration
# ============================================
# Enable proxy header support for Nginx reverse proxy
# These headers are set by Nginx and contain original client info
SECURE_PROXY_HEADER_ENVIRON = os.environ.get('SECURE_PROXY_HEADER_ENVIRON', 'HTTP_X_FORWARDED_FOR')
SECURE_PROXY_HEADER = os.environ.get('SECURE_PROXY_HEADER', 'HTTP_X_FORWARDED_PROTO')

# Trusted proxies (IPs allowed to set X-Forwarded-* headers)
# In Docker: 'nginx' service name resolves internally
# Format: comma-separated list (e.g., "127.0.0.1,nginx,172.0.0.0/8")
TRUSTED_PROXIES_STR = os.environ.get('TRUSTED_PROXIES', '127.0.0.1,nginx,172.17.0.0/12')
TRUSTED_PROXIES = [ip.strip() for ip in TRUSTED_PROXIES_STR.split(',')]

# Updated CORS settings for proxy through Nginx
# Allow requests from frontend at https://localhost (through Nginx HTTPS)
CORS_TRUSTED_ORIGINS = [
    "http://localhost:5173",      # Vite dev server (local)
    "http://localhost:3000",      # Alternative dev port
    "http://127.0.0.1:5173",
    "https://localhost",          # Production through Nginx
    "https://localhost:443",
    "https://127.0.0.1",
    # Add production domain when available:
    # "https://api.example.com",
    # "https://example.com",
]

# Security headers when behind proxy
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'false').lower() == 'true'
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'false').lower() == 'true'

# Set these to True in production (behind HTTPS Nginx proxy)
# Development: Keep False to work with http://localhost through Nginx redirect
INSTALLED_APPS = [
    "daphne",
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'ninja_extra',
    'ninja_jwt',
    'accounts',
    'tickets',
    'departments',
    'corsheaders',

]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CORS Configuration
# Use CORS_TRUSTED_ORIGINS instead of allowing all origins in production
CORS_ALLOW_CREDENTIALS = True
# CORS_ALLOW_ALL_ORIGINS = True  # ⚠️ Only for development! Set to False in production

# Use the CORS_TRUSTED_ORIGINS defined in proxy section above

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = "core.asgi.application"


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env('DB_PORT'),
    }
}
# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Cairo'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

AUTH_USER_MODEL = 'accounts.User'

SIMPLE_JWT = {
   'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
   "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

NINJA_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_TOKEN_CLASSES': ('core.api.CustomAccessToken',),
}
# WebSockets / Channels Configuration
# Redis configuration for Django Channels
# Use environment-specific host: 'redis' for Docker, 'localhost' for local dev
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')  # Defaults to localhost for development
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_DB = int(os.environ.get('REDIS_DB', 0))

# Channel layer configuration (from environment variables)
CHANNEL_CAPACITY = int(os.environ.get('CHANNEL_CAPACITY', 5000))  # Messages to buffer per channel
CHANNEL_EXPIRY = int(os.environ.get('CHANNEL_EXPIRY', 300))  # Seconds to keep messages (5 minutes default)

# Channels-Redis configuration
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(REDIS_HOST, REDIS_PORT)],
            "capacity": CHANNEL_CAPACITY,
            "expiry": CHANNEL_EXPIRY,
        },
    },
}

# Fallback for development without Redis:
# Uncomment the following to use in-memory channel layer (development only)
# CHANNEL_LAYERS = {
#     "default": {
#         "BACKEND": "channels.layers.InMemoryChannelLayer"
#     }
# }

# ============================================
# Celery Configuration (reuses the same Redis)
# ============================================
_REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"

CELERY_BROKER_URL          = _REDIS_URL
CELERY_RESULT_BACKEND      = _REDIS_URL
CELERY_ACCEPT_CONTENT      = ['json']
CELERY_TASK_SERIALIZER     = 'json'
CELERY_RESULT_SERIALIZER   = 'json'
CELERY_TIMEZONE            = TIME_ZONE
CELERY_TASK_TRACK_STARTED  = True
CELERY_TASK_ACKS_LATE      = True   # task not lost if worker crashes mid-run
CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # one task at a time per worker (AI is slow)
