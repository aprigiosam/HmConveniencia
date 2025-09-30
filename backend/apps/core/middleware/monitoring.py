import json
import logging
import time
from datetime import datetime
from typing import Any, Dict

from django.conf import settings
from django.http import HttpRequest, HttpResponse

logger = logging.getLogger(__name__)


class MonitoringMiddleware:
    """
    Middleware para monitoramento de requests, performance e erros
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        start_time = time.time()

        # Captura informações da request
        request_data = self._get_request_data(request)

        response = self.get_response(request)

        # Calcula tempo de processamento
        process_time = time.time() - start_time

        # Log da request/response
        self._log_request_response(request, response, process_time, request_data)

        # Adiciona headers de monitoramento
        response['X-Response-Time'] = f"{process_time:.3f}s"
        response['X-Request-ID'] = getattr(request, 'request_id', 'unknown')

        return response

    def _get_request_data(self, request: HttpRequest) -> Dict[str, Any]:
        """Extrai dados relevantes da request para logging"""
        # Gera um ID único para a request
        request_id = f"{int(time.time() * 1000000)}"
        request.request_id = request_id

        return {
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'query_params': dict(request.GET),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'ip_address': self._get_client_ip(request),
            'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
            'content_type': request.META.get('CONTENT_TYPE', ''),
            'timestamp': datetime.now().isoformat(),
        }

    def _get_client_ip(self, request: HttpRequest) -> str:
        """Obtém o IP real do cliente considerando proxies"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def _log_request_response(
        self,
        request: HttpRequest,
        response: HttpResponse,
        process_time: float,
        request_data: Dict[str, Any]
    ):
        """Log estruturado da request/response"""

        log_data = {
            **request_data,
            'response': {
                'status_code': response.status_code,
                'content_type': response.get('Content-Type', ''),
                'content_length': len(response.content) if hasattr(response, 'content') else 0,
            },
            'performance': {
                'response_time_ms': round(process_time * 1000, 2),
                'response_time_seconds': round(process_time, 3),
            }
        }

        # Determina o nível do log baseado no status
        if response.status_code >= 500:
            log_level = logging.ERROR
            log_message = f"Server Error: {request.method} {request.path}"
        elif response.status_code >= 400:
            log_level = logging.WARNING
            log_message = f"Client Error: {request.method} {request.path}"
        elif process_time > 2.0:  # Requests lentas
            log_level = logging.WARNING
            log_message = f"Slow Request: {request.method} {request.path}"
        else:
            log_level = logging.INFO
            log_message = f"Request: {request.method} {request.path}"

        # Log estruturado
        logger.log(
            log_level,
            log_message,
            extra={
                'structured_data': log_data,
                'request_id': request_data['request_id'],
                'response_time': process_time,
                'status_code': response.status_code,
            }
        )

        # Log adicional para requests críticas (erros 5xx)
        if response.status_code >= 500:
            self._log_error_details(request, response, log_data)

    def _log_error_details(
        self,
        request: HttpRequest,
        response: HttpResponse,
        log_data: Dict[str, Any]
    ):
        """Log detalhado para erros do servidor"""
        error_data = {
            **log_data,
            'error_details': {
                'response_content': response.content.decode('utf-8', errors='ignore')[:1000],
                'request_body': self._get_request_body(request),
                'session_data': dict(request.session) if hasattr(request, 'session') else {},
            }
        }

        logger.error(
            f"Server Error Details: {request.method} {request.path}",
            extra={'structured_data': error_data}
        )

    def _get_request_body(self, request: HttpRequest) -> str:
        """Obtém o corpo da request de forma segura"""
        try:
            if hasattr(request, 'body') and request.body:
                body = request.body.decode('utf-8', errors='ignore')
                # Limita o tamanho do log e remove dados sensíveis
                if len(body) > 1000:
                    body = body[:1000] + '... (truncated)'

                # Remove possíveis dados sensíveis
                if 'password' in body.lower() or 'token' in body.lower():
                    return '[SENSITIVE DATA REMOVED]'

                return body
        except Exception:
            pass
        return ''


class RequestTrackingMiddleware:
    """
    Middleware para tracking de métricas de requests
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.request_count = 0
        self.error_count = 0
        self.slow_request_count = 0

    def __call__(self, request: HttpRequest) -> HttpResponse:
        self.request_count += 1
        start_time = time.time()

        response = self.get_response(request)

        process_time = time.time() - start_time

        # Incrementa contadores
        if response.status_code >= 500:
            self.error_count += 1

        if process_time > 2.0:
            self.slow_request_count += 1

        # Adiciona métricas ao response (para debugging)
        if settings.DEBUG:
            response['X-Request-Count'] = str(self.request_count)
            response['X-Error-Count'] = str(self.error_count)
            response['X-Slow-Request-Count'] = str(self.slow_request_count)

        return response

    def get_metrics(self) -> Dict[str, int]:
        """Retorna métricas coletadas"""
        return {
            'total_requests': self.request_count,
            'error_requests': self.error_count,
            'slow_requests': self.slow_request_count,
            'success_rate': (
                (self.request_count - self.error_count) / self.request_count * 100
                if self.request_count > 0 else 100
            )
        }