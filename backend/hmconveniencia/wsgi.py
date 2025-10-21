"""
WSGI config for HMConveniencia
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hmconveniencia.settings")
application = get_wsgi_application()
