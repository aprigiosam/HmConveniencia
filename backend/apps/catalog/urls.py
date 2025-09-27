from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, FornecedorViewSet, ProdutoViewSet, LoteProdutoViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'fornecedores', FornecedorViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'lotes', LoteProdutoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
