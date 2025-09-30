"""
Views para combos e produtos compostos
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from decimal import Decimal

from .models_combos import ProdutoCombo, ProdutoComposto, ItemCombo
from .serializers_combos import (
    ProdutoComboSerializer, ProdutoComboCreateSerializer,
    ProdutoCompostoSerializer, ProdutoCompostoCreateSerializer,
)


class ProdutoComboViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar combos
    """
    permission_classes = [IsAuthenticated]
    queryset = ProdutoCombo.objects.all()

    def get_queryset(self):
        queryset = ProdutoCombo.objects.all()

        # Filtros
        ativo = self.request.query_params.get('ativo')
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() == 'true')

        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo=tipo.upper())

        return queryset.prefetch_related('itens', 'itens__produto')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProdutoComboCreateSerializer
        return ProdutoComboSerializer

    @action(detail=True, methods=['get'])
    def verificar_disponibilidade(self, request, pk=None):
        """
        Verifica se combo está disponível para venda
        """
        combo = self.get_object()
        disponivel, motivo = combo.verificar_disponibilidade()

        return Response({
            'disponivel': disponivel,
            'motivo': motivo if not disponivel else None,
            'combo': {
                'id': combo.id,
                'nome': combo.nome,
                'preco': float(combo.preco_combo)
            }
        })

    @action(detail=True, methods=['post'])
    def atualizar_calculos(self, request, pk=None):
        """
        Recalcula preço original e desconto percentual
        """
        combo = self.get_object()
        combo.atualizar_calculos()

        serializer = self.get_serializer(combo)
        return Response({
            'message': 'Cálculos atualizados',
            'combo': serializer.data
        })

    @action(detail=True, methods=['post'])
    def adicionar_item(self, request, pk=None):
        """
        Adiciona item ao combo
        Body: {
            "produto_id": 1,
            "quantidade": 2,
            "opcional": false,
            "substituivel": false,
            "ordem": 0
        }
        """
        combo = self.get_object()

        try:
            item = ItemCombo.objects.create(
                combo=combo,
                produto_id=request.data['produto_id'],
                quantidade=Decimal(str(request.data.get('quantidade', 1))),
                opcional=request.data.get('opcional', False),
                substituivel=request.data.get('substituivel', False),
                ordem=request.data.get('ordem', 0)
            )

            # Atualiza cálculos
            combo.atualizar_calculos()

            from .serializers_combos import ItemComboSerializer
            serializer = ItemComboSerializer(item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except KeyError as e:
            return Response(
                {'error': f'Campo obrigatório ausente: {e}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['delete'])
    def remover_item(self, request, pk=None):
        """
        Remove item do combo
        Query: ?item_id=1
        """
        combo = self.get_object()
        item_id = request.query_params.get('item_id')

        if not item_id:
            return Response(
                {'error': 'item_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            item = ItemCombo.objects.get(id=item_id, combo=combo)
            item.delete()

            # Atualiza cálculos
            combo.atualizar_calculos()

            return Response({'message': 'Item removido do combo'})

        except ItemCombo.DoesNotExist:
            return Response(
                {'error': 'Item não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def disponiveis(self, request):
        """
        Lista apenas combos disponíveis para venda
        """
        combos = self.get_queryset().filter(ativo=True)
        combos_disponiveis = []

        for combo in combos:
            disponivel, _ = combo.verificar_disponibilidade()
            if disponivel:
                combos_disponiveis.append(combo)

        serializer = self.get_serializer(combos_disponiveis, many=True)
        return Response(serializer.data)


class ProdutoCompostoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar produtos compostos
    """
    permission_classes = [IsAuthenticated]
    queryset = ProdutoComposto.objects.all()

    def get_queryset(self):
        return ProdutoComposto.objects.all().prefetch_related(
            'ingredientes',
            'ingredientes__produto_ingrediente'
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProdutoCompostoCreateSerializer
        return ProdutoCompostoSerializer

    @action(detail=True, methods=['get'])
    def verificar_estoque(self, request, pk=None):
        """
        Verifica disponibilidade de ingredientes
        Query: ?quantidade=5 (quantidade a produzir)
        """
        composto = self.get_object()
        quantidade = Decimal(str(request.query_params.get('quantidade', 1)))

        disponivel, faltantes = composto.verificar_estoque_ingredientes()

        # Ajusta faltantes pela quantidade
        if not disponivel and quantidade > 1:
            faltantes_ajustados = []
            for faltante in faltantes:
                faltante_copy = faltante.copy()
                faltante_copy['necessario'] = faltante['necessario'] * float(quantidade)
                faltantes_ajustados.append(faltante_copy)
            faltantes = faltantes_ajustados

        return Response({
            'disponivel': disponivel,
            'quantidade_solicitada': float(quantidade),
            'ingredientes_faltantes': faltantes
        })

    @action(detail=True, methods=['post'])
    def produzir(self, request, pk=None):
        """
        Registra produção do produto e baixa estoque de ingredientes
        Body: {
            "quantidade": 10,
            "observacoes": "Produção do dia"
        }
        """
        composto = self.get_object()
        quantidade = Decimal(str(request.data.get('quantidade', 1)))

        # Verifica estoque
        disponivel, faltantes = composto.verificar_estoque_ingredientes()
        if not disponivel:
            return Response({
                'error': 'Estoque insuficiente de ingredientes',
                'ingredientes_faltantes': faltantes
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Baixa estoque dos ingredientes
            composto.baixar_estoque_ingredientes(quantidade)

            # Aumenta estoque do produto final
            produto_final = composto.produto_final
            produto_final.estoque += quantidade
            produto_final.save(update_fields=['estoque', 'updated_at'])

            return Response({
                'message': f'{float(quantidade)} unidades produzidas com sucesso',
                'produto_final': {
                    'id': produto_final.id,
                    'nome': produto_final.nome,
                    'estoque_atual': float(produto_final.estoque)
                }
            })

        except Exception as e:
            return Response(
                {'error': f'Erro ao produzir: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def calcular_custo(self, request, pk=None):
        """
        Calcula custo total e margem de lucro
        """
        composto = self.get_object()
        custo_total = composto.calcular_custo_total()
        preco_venda = composto.produto_final.preco_venda

        lucro = preco_venda - custo_total
        margem_percentual = (lucro / preco_venda * 100) if preco_venda > 0 else 0

        return Response({
            'custo_total': float(custo_total),
            'preco_venda': float(preco_venda),
            'lucro_unitario': float(lucro),
            'margem_percentual': round(float(margem_percentual), 2),
            'ingredientes': [
                {
                    'nome': ing.produto_ingrediente.nome,
                    'quantidade': float(ing.quantidade),
                    'unidade': ing.unidade,
                    'custo_unitario': float(ing.produto_ingrediente.preco_custo),
                    'custo_total': float(ing.produto_ingrediente.preco_custo * ing.quantidade)
                }
                for ing in composto.ingredientes.all()
            ]
        })