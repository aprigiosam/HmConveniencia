from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VendaViewSet, ItemVendaViewSet, PagamentoVendaViewSet,
    SessaoPDVViewSet, MovimentacaoCaixaViewSet
)

router = DefaultRouter()
router.register(r'vendas', VendaViewSet)
router.register(r'itens', ItemVendaViewSet)
router.register(r'pagamentos', PagamentoVendaViewSet)
router.register(r'sessoes', SessaoPDVViewSet, basename='sessao')
router.register(r'movimentacoes-caixa', MovimentacaoCaixaViewSet, basename='movimentacao-caixa')

urlpatterns = [
    path('', include(router.urls)),
]
