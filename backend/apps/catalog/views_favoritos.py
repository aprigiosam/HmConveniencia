"""
Views para produtos favoritos e grids personalizáveis
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models_favoritos import ProdutoFavorito, GridProdutoPDV
from .serializers_favoritos import (
    ProdutoFavoritoSerializer,
    ProdutoFavoritoCreateSerializer,
    GridProdutoPDVSerializer,
    GridProdutoPDVCreateSerializer,
)


class ProdutoFavoritoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar produtos favoritos
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Retorna apenas favoritos do usuário/loja atual"""
        user = self.request.user
        return ProdutoFavorito.objects.filter(
            usuario=user,
            loja=user.loja
        ).select_related('produto', 'produto__categoria')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProdutoFavoritoCreateSerializer
        return ProdutoFavoritoSerializer

    @action(detail=True, methods=['post'])
    def usar(self, request, pk=None):
        """
        Incrementa contador de uso do favorito
        Chamado quando produto é adicionado à venda via favoritos
        """
        favorito = self.get_object()
        favorito.incrementar_uso()

        return Response({
            'message': 'Contador incrementado',
            'contador_uso': favorito.contador_uso
        })

    @action(detail=False, methods=['post'])
    def reordenar(self, request):
        """
        Reordena favoritos
        Body: [
            {"id": 1, "ordem": 0},
            {"id": 2, "ordem": 1},
            ...
        ]
        """
        items = request.data

        if not isinstance(items, list):
            return Response(
                {'error': 'Esperado uma lista de itens'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            for item in items:
                favorito = ProdutoFavorito.objects.get(
                    id=item['id'],
                    usuario=request.user
                )
                favorito.ordem = item['ordem']
                favorito.save(update_fields=['ordem', 'updated_at'])

            return Response({'message': 'Favoritos reordenados com sucesso'})

        except ProdutoFavorito.DoesNotExist:
            return Response(
                {'error': 'Favorito não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except KeyError as e:
            return Response(
                {'error': f'Campo obrigatório ausente: {e}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def top_usados(self, request):
        """
        Retorna favoritos mais usados
        Query: ?limit=10
        """
        limit = int(request.query_params.get('limit', 10))

        favoritos = self.get_queryset().order_by('-contador_uso')[:limit]
        serializer = self.get_serializer(favoritos, many=True)

        return Response(serializer.data)


class GridProdutoPDVViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar grids personalizáveis de produtos
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Retorna grids do usuário/loja ou compartilhados"""
        user = self.request.user
        return GridProdutoPDV.objects.filter(
            loja=user.loja,
            ativo=True
        ).filter(
            models.Q(usuario=user) | models.Q(usuario__isnull=True)
        ).prefetch_related('itens', 'itens__produto')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return GridProdutoPDVCreateSerializer
        return GridProdutoPDVSerializer

    @action(detail=True, methods=['post'])
    def adicionar_produto(self, request, pk=None):
        """
        Adiciona produto ao grid
        Body: {
            "produto_id": 1,
            "posicao_x": 0,
            "posicao_y": 0,
            "cor_fundo": "#FF0000",
            "tamanho": "normal"
        }
        """
        grid = self.get_object()

        from .models_favoritos import ItemGridPDV
        from .models import Produto

        try:
            produto = Produto.objects.get(id=request.data['produto_id'])

            item = ItemGridPDV.objects.create(
                grid=grid,
                produto=produto,
                posicao_x=request.data.get('posicao_x', 0),
                posicao_y=request.data.get('posicao_y', 0),
                cor_fundo=request.data.get('cor_fundo', '#FFFFFF'),
                tamanho=request.data.get('tamanho', 'normal'),
            )

            from .serializers_favoritos import ItemGridPDVSerializer
            serializer = ItemGridPDVSerializer(item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Produto.DoesNotExist:
            return Response(
                {'error': 'Produto não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except KeyError as e:
            return Response(
                {'error': f'Campo obrigatório ausente: {e}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['delete'])
    def remover_produto(self, request, pk=None):
        """
        Remove produto do grid
        Query: ?produto_id=1
        """
        grid = self.get_object()
        produto_id = request.query_params.get('produto_id')

        if not produto_id:
            return Response(
                {'error': 'produto_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from .models_favoritos import ItemGridPDV
            item = ItemGridPDV.objects.get(
                grid=grid,
                produto_id=produto_id
            )
            item.delete()

            return Response({'message': 'Produto removido do grid'})

        except ItemGridPDV.DoesNotExist:
            return Response(
                {'error': 'Produto não encontrado no grid'},
                status=status.HTTP_404_NOT_FOUND
            )


# Importação necessária
from django.db import models