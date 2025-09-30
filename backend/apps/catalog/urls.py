"""
URLs consolidadas do catálogo
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoriaViewSet, FornecedorViewSet, ProdutoViewSet, LoteProdutoViewSet,
    ProdutoComboViewSet, ProdutoCompostoViewSet,
    ProdutoFavoritoViewSet, GridProdutoPDVViewSet,
    ListaPrecoViewSet, PromocaoViewSet, UsoPromocaoViewSet
)

router = DefaultRouter()

# Produtos básicos
router.register(r'categorias', CategoriaViewSet)
router.register(r'fornecedores', FornecedorViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'lotes', LoteProdutoViewSet)

# Combos e compostos
router.register(r'combos', ProdutoComboViewSet)
router.register(r'compostos', ProdutoCompostoViewSet)

# Favoritos e grids
router.register(r'favoritos', ProdutoFavoritoViewSet)
router.register(r'grids', GridProdutoPDVViewSet)

# Preços e promoções
router.register(r'listas-preco', ListaPrecoViewSet)
router.register(r'promocoes', PromocaoViewSet)
router.register(r'usos-promocao', UsoPromocaoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]