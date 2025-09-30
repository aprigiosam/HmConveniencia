from django.middleware.csrf import CsrfViewMiddleware
from django.conf import settings
import re


class CSRFExemptMiddleware(CsrfViewMiddleware):
    """
    Middleware que permite exemption de CSRF para URLs específicas
    """

    def process_view(self, request, callback, callback_args, callback_kwargs):
        # Get exempt URLs from settings
        exempt_urls = getattr(settings, 'CSRF_EXEMPT_URLS', [])

        # Check if current request path matches any exempt pattern
        for pattern in exempt_urls:
            if re.match(pattern, request.path):
                return None

        # For all other requests, use default CSRF protection
        return super().process_view(request, callback, callback_args, callback_kwargs)