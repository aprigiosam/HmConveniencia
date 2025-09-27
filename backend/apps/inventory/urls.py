from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EstoqueViewSet, MovimentacaoEstoqueViewSet, LoteViewSet,
    TransferenciaEstoqueViewSet, InventarioEstoqueViewSet, ItemInventarioViewSet
)

router = DefaultRouter()
router.register(r'estoque', EstoqueViewSet, basename='estoque')
router.register(r'lotes', LoteViewSet)
router.register(r'movimentacoes', MovimentacaoEstoqueViewSet)
router.register(r'transferencias', TransferenciaEstoqueViewSet)
router.register(r'inventarios', InventarioEstoqueViewSet)
router.register(r'itens-inventario', ItemInventarioViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
