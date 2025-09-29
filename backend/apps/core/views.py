from decimal import Decimal

from django.db.models import Case, Count, DecimalField, ExpressionWrapper, F, Max, Q, Sum, Value, When
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.sales.models import Venda

from .models import Cliente, FormaPagamento, Loja
from .serializers import ClienteSerializer, FormaPagamentoSerializer, LojaSerializer


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
