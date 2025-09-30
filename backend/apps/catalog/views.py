"""
Views consolidadas do catálogo
Inclui: Produtos, Combos, Favoritos, Grids, Listas de Preços, Promoções
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F, Count, Sum, Value, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce

from .models import (
    Categoria, Fornecedor, Produto, LoteProduto,
    ProdutoCombo, ItemCombo, ProdutoComposto, IngredienteComposto,
    ProdutoFavorito, GridProdutoPDV, ItemGridPDV,
    ListaPreco, ItemListaPreco, Promocao, UsoPromocao
)
from .serializers import (
    CategoriaSerializer, FornecedorSerializer,
    ProdutoSerializer, ProdutoListSerializer, LoteProdutoSerializer,
    ProdutoComLoteSerializer,
    ProdutoComboSerializer, ProdutoComboCreateSerializer,
    ProdutoCompostoSerializer, ProdutoCompostoCreateSerializer,
    ProdutoFavoritoSerializer, ProdutoFavoritoCreateSerializer,
    GridProdutoPDVSerializer, GridProdutoPDVCreateSerializer,
    ListaPrecoSerializer, PromocaoSerializer, UsoPromocaoSerializer
)


# ========================================
# PRODUTOS BÁSICOS
# ========================================


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
        elif self.action == 'create':
            # Check if request has lot data to decide which serializer to use
            if hasattr(self.request, 'data') and 'lote_inicial' in self.request.data:
                return ProdutoComLoteSerializer
            return ProdutoSerializer
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


# ========================================
# COMBOS E PRODUTOS COMPOSTOS
# ========================================

class ProdutoComboViewSet(viewsets.ModelViewSet):
    queryset = ProdutoCombo.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProdutoComboCreateSerializer
        return ProdutoComboSerializer

    def get_queryset(self):
        queryset = ProdutoCombo.objects.all()
        ativo = self.request.query_params.get('ativo')
        search = self.request.query_params.get('search')

        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() in ('true', '1'))

        if search:
            queryset = queryset.filter(Q(nome__icontains=search) | Q(sku__icontains=search))

        return queryset

    @action(detail=True, methods=['get'])
    def verificar_disponibilidade(self, request, pk=None):
        combo = self.get_object()
        disponivel, motivo = combo.verificar_disponibilidade()
        return Response({'disponivel': disponivel, 'motivo': motivo})

    @action(detail=True, methods=['post'])
    def atualizar_calculos(self, request, pk=None):
        combo = self.get_object()
        combo.atualizar_calculos()
        serializer = self.get_serializer(combo)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def disponiveis(self, request):
        combos = []
        for combo in self.get_queryset():
            disponivel, _ = combo.verificar_disponibilidade()
            if disponivel:
                combos.append(combo)
        serializer = self.get_serializer(combos, many=True)
        return Response(serializer.data)


class ProdutoCompostoViewSet(viewsets.ModelViewSet):
    queryset = ProdutoComposto.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProdutoCompostoCreateSerializer
        return ProdutoCompostoSerializer

    @action(detail=True, methods=['get'])
    def verificar_estoque(self, request, pk=None):
        composto = self.get_object()
        disponivel, faltantes = composto.verificar_estoque_ingredientes()
        return Response({'disponivel': disponivel, 'ingredientes_faltantes': faltantes})

    @action(detail=True, methods=['post'])
    def produzir(self, request, pk=None):
        from decimal import Decimal
        composto = self.get_object()
        quantidade = Decimal(request.data.get('quantidade', '1.0'))

        disponivel, faltantes = composto.verificar_estoque_ingredientes()
        if not disponivel:
            return Response(
                {'error': 'Estoque insuficiente', 'faltantes': faltantes},
                status=status.HTTP_400_BAD_REQUEST
            )

        composto.baixar_estoque_ingredientes(quantidade)
        return Response({'success': True, 'quantidade_produzida': float(quantidade)})

    @action(detail=True, methods=['get'])
    def calcular_custo(self, request, pk=None):
        composto = self.get_object()
        custo = composto.calcular_custo_total()
        return Response({'custo_total': float(custo)})


# ========================================
# FAVORITOS E GRIDS
# ========================================

class ProdutoFavoritoViewSet(viewsets.ModelViewSet):
    queryset = ProdutoFavorito.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return ProdutoFavoritoCreateSerializer
        return ProdutoFavoritoSerializer

    def get_queryset(self):
        return ProdutoFavorito.objects.filter(
            usuario=self.request.user,
            loja=self.request.user.loja
        )

    @action(detail=True, methods=['post'])
    def usar(self, request, pk=None):
        favorito = self.get_object()
        favorito.incrementar_uso()
        serializer = self.get_serializer(favorito)
        return Response(serializer.data)


class GridProdutoPDVViewSet(viewsets.ModelViewSet):
    queryset = GridProdutoPDV.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return GridProdutoPDVCreateSerializer
        return GridProdutoPDVSerializer

    def get_queryset(self):
        return GridProdutoPDV.objects.filter(
            loja=self.request.user.loja,
            ativo=True
        )

    @action(detail=True, methods=['post'])
    def adicionar_produto(self, request, pk=None):
        grid = self.get_object()
        produto_id = request.data.get('produto_id')
        posicao_x = request.data.get('posicao_x', 0)
        posicao_y = request.data.get('posicao_y', 0)

        ItemGridPDV.objects.create(
            grid=grid,
            produto_id=produto_id,
            posicao_x=posicao_x,
            posicao_y=posicao_y
        )

        serializer = self.get_serializer(grid)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def remover_produto(self, request, pk=None):
        grid = self.get_object()
        produto_id = request.data.get('produto_id')
        grid.itens.filter(produto_id=produto_id).delete()
        serializer = self.get_serializer(grid)
        return Response(serializer.data)


# ========================================
# LISTAS DE PREÇOS E PROMOÇÕES
# ========================================

class ListaPrecoViewSet(viewsets.ModelViewSet):
    queryset = ListaPreco.objects.all()
    serializer_class = ListaPrecoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ListaPreco.objects.filter(loja=self.request.user.loja)
        ativa = self.request.query_params.get('ativa')

        if ativa is not None:
            queryset = queryset.filter(ativa=ativa.lower() in ('true', '1'))

        return queryset

    @action(detail=False, methods=['get'])
    def vigentes(self, request):
        listas = [lista for lista in self.get_queryset() if lista.esta_vigente()]
        serializer = self.get_serializer(listas, many=True)
        return Response(serializer.data)


class PromocaoViewSet(viewsets.ModelViewSet):
    queryset = Promocao.objects.all()
    serializer_class = PromocaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Promocao.objects.filter(loja=self.request.user.loja)
        ativa = self.request.query_params.get('ativa')

        if ativa is not None:
            queryset = queryset.filter(ativa=ativa.lower() in ('true', '1'))

        return queryset

    @action(detail=False, methods=['get'])
    def vigentes(self, request):
        promocoes = [p for p in self.get_queryset() if p.esta_vigente()]
        serializer = self.get_serializer(promocoes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def produto_elegivel(self, request, pk=None):
        promocao = self.get_object()
        produto_id = request.query_params.get('produto_id')

        if not produto_id:
            return Response({'error': 'produto_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            produto = Produto.objects.get(id=produto_id)
            elegivel = promocao.produto_elegivel(produto)
            return Response({'elegivel': elegivel})
        except Produto.DoesNotExist:
            return Response({'error': 'Produto não encontrado'}, status=status.HTTP_404_NOT_FOUND)


class UsoPromocaoViewSet(viewsets.ModelViewSet):
    queryset = UsoPromocao.objects.all()
    serializer_class = UsoPromocaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = UsoPromocao.objects.filter(promocao__loja=self.request.user.loja)
        promocao_id = self.request.query_params.get('promocao_id')
        cliente_id = self.request.query_params.get('cliente_id')

        if promocao_id:
            queryset = queryset.filter(promocao_id=promocao_id)

        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)

        return queryset
