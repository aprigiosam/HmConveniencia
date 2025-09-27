from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContaReceberViewSet, ContaPagarViewSet, FluxoCaixaViewSet

router = DefaultRouter()
router.register(r'contas-receber', ContaReceberViewSet)
router.register(r'contas-pagar', ContaPagarViewSet)
router.register(r'fluxo-caixa', FluxoCaixaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
