import logging
import time
from datetime import datetime, timedelta
from decimal import Decimal

from django.conf import settings
from django.db import connection
from django.db.models import Case, Count, DecimalField, ExpressionWrapper, F, Max, Q, Sum, Value, When
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.sales.models import Venda

from .models import Cliente, FormaPagamento, Loja
from .serializers import ClienteSerializer, FormaPagamentoSerializer, LojaSerializer

logger = logging.getLogger(__name__)


class LojaViewSet(viewsets.ModelViewSet):
    queryset = Loja.objects.all()
    serializer_class = LojaSerializer
    permission_classes = [IsAuthenticated]


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Cliente.objects.all()
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(nome__icontains=search)
                | Q(cpf__icontains=search)
                | Q(email__icontains=search)
                | Q(telefone__icontains=search)
            )

        ativo = self.request.query_params.get("ativo")
        if ativo is not None:
            normalized = ativo.lower()
            if normalized in {"true", "1", "t", "on"}:
                queryset = queryset.filter(ativo=True)
            elif normalized in {"false", "0", "f", "off"}:
                queryset = queryset.filter(ativo=False)

        finalizadas = Q(vendas__status=Venda.Status.FINALIZADA)

        queryset = queryset.annotate(
            total_compras=Coalesce(
                Count("vendas", filter=finalizadas, distinct=True),
                Value(0),
            ),
            valor_total=Coalesce(
                Sum("vendas__valor_total", filter=finalizadas),
                Value(Decimal("0"), output_field=DecimalField(max_digits=12, decimal_places=2)),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            total_itens=Coalesce(
                Sum("vendas__itens__quantidade", filter=finalizadas),
                Value(Decimal("0"), output_field=DecimalField(max_digits=12, decimal_places=2)),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            ultima_compra=Max("vendas__created_at", filter=finalizadas),
        ).annotate(
            ticket_medio=Case(
                When(
                    total_compras__gt=0,
                    then=ExpressionWrapper(
                        F("valor_total") / F("total_compras"),
                        output_field=DecimalField(max_digits=12, decimal_places=2),
                    ),
                ),
                default=Value(
                    Decimal("0"),
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )

        return queryset


class FormaPagamentoViewSet(viewsets.ModelViewSet):
    queryset = FormaPagamento.objects.filter(ativo=True)
    serializer_class = FormaPagamentoSerializer
    permission_classes = [IsAuthenticated]


@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """
    Health check endpoint para monitoramento
    """
    start_time = time.time()

    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "environment": "development" if settings.DEBUG else "production",
        "checks": {}
    }

    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        health_status["checks"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
        logger.error(f"Health check database error: {e}")

    # Check Redis connection
    try:
        from django.core.cache import cache
        cache.set('health_check', 'ok', 10)
        test_value = cache.get('health_check')
        if test_value == 'ok':
            health_status["checks"]["redis"] = {
                "status": "healthy",
                "message": "Redis connection successful"
            }
        else:
            raise Exception("Redis test failed")
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["redis"] = {
            "status": "unhealthy",
            "message": f"Redis connection failed: {str(e)}"
        }
        logger.error(f"Health check Redis error: {e}")

    # Response time
    response_time = round((time.time() - start_time) * 1000, 2)
    health_status["response_time_ms"] = response_time

    # HTTP status based on overall health
    http_status = 200 if health_status["status"] == "healthy" else 503

    return JsonResponse(health_status, status=http_status)


@api_view(['GET'])
@permission_classes([AllowAny])
def system_metrics(request):
    """
    Endpoint para métricas do sistema
    """
    try:
        from django.db import models
        from apps.catalog.models import Produto, Categoria, Fornecedor
        from apps.sales.models import Venda, ItemVenda
        from apps.inventory.models import InventarioEstoque

        # Métricas básicas
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "database": {
                "produtos_total": Produto.objects.count(),
                "categorias_total": Categoria.objects.count(),
                "fornecedores_total": Fornecedor.objects.count(),
                "vendas_total": Venda.objects.count(),
                "vendas_hoje": Venda.objects.filter(
                    data_venda__date=datetime.now().date()
                ).count(),
                "vendas_ultima_semana": Venda.objects.filter(
                    data_venda__gte=datetime.now() - timedelta(days=7)
                ).count(),
            },
            "performance": {
                "active_connections": len(connection.queries),
            }
        }

        # Métricas de vendas recentes
        vendas_recentes = Venda.objects.filter(
            data_venda__gte=datetime.now() - timedelta(hours=24)
        ).aggregate(
            total_vendas=models.Sum('valor_total'),
            count=models.Count('id')
        )

        metrics["vendas_24h"] = {
            "total_valor": float(vendas_recentes['total_vendas'] or 0),
            "total_vendas": vendas_recentes['count'] or 0
        }

        return Response(metrics, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"System metrics error: {e}")
        return Response(
            {"error": "Failed to get system metrics", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def system_status(request):
    """
    Status geral do sistema com informações detalhadas
    """
    try:
        import psutil
        import os

        # Informações do sistema
        status_info = {
            "timestamp": datetime.now().isoformat(),
            "uptime": {
                "process_uptime": time.time() - psutil.Process(os.getpid()).create_time(),
            },
            "memory": {
                "usage_percent": psutil.virtual_memory().percent,
                "available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
                "total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            },
            "disk": {
                "usage_percent": psutil.disk_usage('/').percent,
                "free_gb": round(psutil.disk_usage('/').free / (1024**3), 2),
                "total_gb": round(psutil.disk_usage('/').total / (1024**3), 2),
            },
            "cpu": {
                "usage_percent": psutil.cpu_percent(interval=1),
                "cores": psutil.cpu_count(),
            }
        }

        return Response(status_info, status=status.HTTP_200_OK)

    except ImportError:
        # Se psutil não estiver disponível, retorna informações básicas
        basic_status = {
            "timestamp": datetime.now().isoformat(),
            "message": "Basic status check - psutil not available for detailed metrics",
            "django_debug": settings.DEBUG,
        }
        return Response(basic_status, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"System status error: {e}")
        return Response(
            {"error": "Failed to get system status", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
