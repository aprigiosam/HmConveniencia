from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VendaViewSet, ItemVendaViewSet, PagamentoVendaViewSet

router = DefaultRouter()
router.register(r'vendas', VendaViewSet)
router.register(r'itens', ItemVendaViewSet)
router.register(r'pagamentos', PagamentoVendaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
