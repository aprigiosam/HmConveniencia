from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from datetime import date
from .models import ContaReceber, ContaPagar, FluxoCaixa
from .serializers import ContaReceberSerializer, ContaPagarSerializer, FluxoCaixaSerializer


class ContaReceberViewSet(viewsets.ModelViewSet):
    queryset = ContaReceber.objects.all()
    serializer_class = ContaReceberSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ContaReceber.objects.all()
        status_param = self.request.query_params.get('status', None)
        loja = self.request.query_params.get('loja', None)

        if status_param is not None:
            queryset = queryset.filter(status=status_param)

        if loja is not None:
            queryset = queryset.filter(loja_id=loja)

        return queryset

    @action(detail=True, methods=['post'])
    def marcar_pago(self, request, pk=None):
        conta = self.get_object()
        conta.status = ContaReceber.Status.PAGO
        conta.data_pagamento = date.today()
        conta.save()
        return Response({'status': 'Conta marcada como paga'})

    @action(detail=False, methods=['get'])
    def vencidas(self, request):
        contas_vencidas = self.get_queryset().filter(
            data_vencimento__lt=date.today(),
            status=ContaReceber.Status.PENDENTE
        )
        serializer = self.get_serializer(contas_vencidas, many=True)
        return Response(serializer.data)


class ContaPagarViewSet(viewsets.ModelViewSet):
    queryset = ContaPagar.objects.all()
    serializer_class = ContaPagarSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ContaPagar.objects.all()
        status_param = self.request.query_params.get('status', None)
        loja = self.request.query_params.get('loja', None)

        if status_param is not None:
            queryset = queryset.filter(status=status_param)

        if loja is not None:
            queryset = queryset.filter(loja_id=loja)

        return queryset

    @action(detail=True, methods=['post'])
    def marcar_pago(self, request, pk=None):
        conta = self.get_object()
        conta.status = ContaPagar.Status.PAGO
        conta.data_pagamento = date.today()
        conta.save()
        return Response({'status': 'Conta marcada como paga'})

    @action(detail=False, methods=['get'])
    def vencidas(self, request):
        contas_vencidas = self.get_queryset().filter(
            data_vencimento__lt=date.today(),
            status=ContaPagar.Status.PENDENTE
        )
        serializer = self.get_serializer(contas_vencidas, many=True)
        return Response(serializer.data)


class FluxoCaixaViewSet(viewsets.ModelViewSet):
    queryset = FluxoCaixa.objects.all()
    serializer_class = FluxoCaixaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = FluxoCaixa.objects.all()
        tipo = self.request.query_params.get('tipo', None)
        loja = self.request.query_params.get('loja', None)
        data_inicio = self.request.query_params.get('data_inicio', None)
        data_fim = self.request.query_params.get('data_fim', None)

        if tipo is not None:
            queryset = queryset.filter(tipo=tipo)

        if loja is not None:
            queryset = queryset.filter(loja_id=loja)

        if data_inicio is not None:
            queryset = queryset.filter(data__gte=data_inicio)

        if data_fim is not None:
            queryset = queryset.filter(data__lte=data_fim)

        return queryset

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        queryset = self.get_queryset()
        entradas = queryset.filter(tipo=FluxoCaixa.Tipo.ENTRADA).aggregate(
            total=Sum('valor'))['total'] or 0
        saidas = queryset.filter(tipo=FluxoCaixa.Tipo.SAIDA).aggregate(
            total=Sum('valor'))['total'] or 0
        saldo = entradas - saidas

        return Response({
            'entradas': entradas,
            'saidas': saidas,
            'saldo': saldo
        })
