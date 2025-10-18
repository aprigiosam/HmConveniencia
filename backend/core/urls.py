"""
URLs da API - HMConveniencia
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClienteViewSet,
    ProdutoViewSet,
    VendaViewSet,
    CaixaViewSet,
    BackupViewSet,
    CategoriaViewSet,
    login,
    logout,
    me,
    health_check
)

router = DefaultRouter()
router.register('clientes', ClienteViewSet, basename='cliente')
router.register('produtos', ProdutoViewSet, basename='produto')
router.register('vendas', VendaViewSet, basename='venda')
router.register('caixa', CaixaViewSet, basename='caixa')
router.register('backup', BackupViewSet, basename='backup')
router.register('categorias', CategoriaViewSet, basename='categoria')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', login, name='login'),
    path('auth/logout/', logout, name='logout'),
    path('auth/me/', me, name='me'),
    path('health/', health_check, name='health_check'),
]
