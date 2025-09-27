from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Loja, Cliente, FormaPagamento
from .serializers import LojaSerializer, ClienteSerializer, FormaPagamentoSerializer


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
        search = self.request.query_params.get('search', None)
        if search is not None:
            queryset = queryset.filter(nome__icontains=search)
        return queryset


class FormaPagamentoViewSet(viewsets.ModelViewSet):
    queryset = FormaPagamento.objects.filter(ativo=True)
    serializer_class = FormaPagamentoSerializer
    permission_classes = [IsAuthenticated]
