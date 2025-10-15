"""
URLs da API - HMConveniencia
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet, ProdutoViewSet, VendaViewSet

router = DefaultRouter()
router.register('clientes', ClienteViewSet, basename='cliente')
router.register('produtos', ProdutoViewSet, basename='produto')
router.register('vendas', VendaViewSet, basename='venda')

urlpatterns = [
    path('', include(router.urls)),
]
