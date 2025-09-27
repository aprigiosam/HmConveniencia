from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F
from .models import Categoria, Fornecedor, Produto, LoteProduto
from .serializers import (
    CategoriaSerializer, FornecedorSerializer,
    ProdutoSerializer, ProdutoListSerializer, LoteProdutoSerializer
)


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Categoria.objects.all()
        search = self.request.query_params.get('search', None)
        if search is not None:
            queryset = queryset.filter(nome__icontains=search)
        return queryset


class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.filter(ativo=True)
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Fornecedor.objects.filter(ativo=True)
        search = self.request.query_params.get('search', None)
        if search is not None:
            queryset = queryset.filter(
                Q(nome__icontains=search) | Q(cnpj_cpf__icontains=search)
            )
        return queryset


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.filter(ativo=True)
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ProdutoListSerializer
        return ProdutoSerializer

    def get_queryset(self):
        queryset = Produto.objects.filter(ativo=True)
        search = self.request.query_params.get('search', None)
        categoria = self.request.query_params.get('categoria', None)
        fornecedor = self.request.query_params.get('fornecedor', None)

        if search is not None:
            queryset = queryset.filter(
                Q(nome__icontains=search) |
                Q(sku__icontains=search) |
                Q(codigo_barras__icontains=search)
            )

        if categoria is not None:
            queryset = queryset.filter(categoria_id=categoria)

        if fornecedor is not None:
            queryset = queryset.filter(fornecedor_id=fornecedor)

        return queryset

    @action(detail=True, methods=['get'])
    def estoque(self, request, pk=None):
        produto = self.get_object()
        lotes = produto.lotes.all()
        serializer = LoteProdutoSerializer(lotes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def estoque_baixo(self, request):
        produtos = self.get_queryset().filter(
            lotes__quantidade__lt=F('estoque_minimo')
        ).distinct()
        serializer = self.get_serializer(produtos, many=True)
        return Response(serializer.data)


class LoteProdutoViewSet(viewsets.ModelViewSet):
    queryset = LoteProduto.objects.all()
    serializer_class = LoteProdutoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = LoteProduto.objects.all()
        produto = self.request.query_params.get('produto', None)
        loja = self.request.query_params.get('loja', None)

        if produto is not None:
            queryset = queryset.filter(produto_id=produto)

        if loja is not None:
            queryset = queryset.filter(loja_id=loja)

        return queryset
