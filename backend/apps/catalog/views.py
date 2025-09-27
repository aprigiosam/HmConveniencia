from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F, Count, Sum, Value, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce
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
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Fornecedor.objects.all()
        search = self.request.query_params.get('search', None)
        ativo = self.request.query_params.get('ativo')

        valor_estoque_expr = ExpressionWrapper(
            F('produtos__lotes__quantidade') * F('produtos__preco_custo'),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )

        queryset = queryset.annotate(
            produtos_ativos=Count('produtos', filter=Q(produtos__ativo=True), distinct=True),
            estoque_total=Coalesce(Sum('produtos__lotes__quantidade'), Value(0)),
            valor_estoque=Coalesce(
                Sum(valor_estoque_expr),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )

        if search is not None:
            queryset = queryset.filter(
                Q(nome__icontains=search) | Q(cnpj_cpf__icontains=search)
            )

        if ativo is not None:
            if ativo.lower() in ('true', '1'):
                queryset = queryset.filter(ativo=True)
            elif ativo.lower() in ('false', '0'):
                queryset = queryset.filter(ativo=False)

        return queryset

    @action(detail=True, methods=['post'])
    def ativar(self, request, pk=None):
        fornecedor = self.get_object()
        fornecedor.ativo = True
        fornecedor.save(update_fields=['ativo'])
        serializer = self.get_serializer(fornecedor)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def desativar(self, request, pk=None):
        fornecedor = self.get_object()
        fornecedor.ativo = False
        fornecedor.save(update_fields=['ativo'])
        serializer = self.get_serializer(fornecedor)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def produtos(self, request, pk=None):
        fornecedor = self.get_object()
        produtos = fornecedor.produtos.filter(ativo=True)
        serializer = ProdutoListSerializer(produtos, many=True)
        return Response(serializer.data)


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
