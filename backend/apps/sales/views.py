from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError

from .models import Venda, ItemVenda, PagamentoVenda
from .serializers import VendaSerializer, VendaCreateSerializer, ItemVendaSerializer, PagamentoVendaSerializer
from .services import finalizar_venda


class VendaViewSet(viewsets.ModelViewSet):
    queryset = Venda.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return VendaCreateSerializer
        return VendaSerializer

    def get_queryset(self):
        queryset = Venda.objects.all()
        status_param = self.request.query_params.get('status', None)
        cliente = self.request.query_params.get('cliente', None)
        loja = self.request.query_params.get('loja', None)

        if status_param is not None:
            queryset = queryset.filter(status=status_param)

        if cliente is not None:
            queryset = queryset.filter(cliente_id=cliente)

        if loja is not None:
            queryset = queryset.filter(loja_id=loja)

        return queryset

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        venda = self.get_object()
        if venda.status != Venda.Status.PENDENTE:
            return Response({'error': 'Venda não pode ser finalizada'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            finalizar_venda(venda, status_anterior=Venda.Status.PENDENTE)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages)

        return Response({'status': 'Venda finalizada'})

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        venda = self.get_object()
        if venda.status == Venda.Status.PENDENTE:
            venda.status = Venda.Status.CANCELADA
            venda.save()
            return Response({'status': 'Venda cancelada'})
        return Response({'error': 'Venda não pode ser cancelada'}, status=status.HTTP_400_BAD_REQUEST)

    def perform_update(self, serializer):
        status_anterior = serializer.instance.status
        with transaction.atomic():
            venda = serializer.save()
            if status_anterior != Venda.Status.FINALIZADA and venda.status == Venda.Status.FINALIZADA:
                try:
                    finalizar_venda(venda, status_anterior=status_anterior)
                except DjangoValidationError as exc:
                    raise DRFValidationError(exc.messages)


class ItemVendaViewSet(viewsets.ModelViewSet):
    queryset = ItemVenda.objects.all()
    serializer_class = ItemVendaSerializer
    permission_classes = [IsAuthenticated]


class PagamentoVendaViewSet(viewsets.ModelViewSet):
    queryset = PagamentoVenda.objects.all()
    serializer_class = PagamentoVendaSerializer
    permission_classes = [IsAuthenticated]
