import re
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin


class CSRFExemptMiddleware(MiddlewareMixin):
    """
    Middleware to exempt specific URLs from CSRF protection
    """

    def process_request(self, request):
        if hasattr(settings, 'CSRF_EXEMPT_URLS'):
            for url_pattern in settings.CSRF_EXEMPT_URLS:
                if re.match(url_pattern, request.path):
                    setattr(request, '_dont_enforce_csrf_checks', True)
                    break
        return None