from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmitenteConfigViewSet, NotaFiscalViewSet

router = DefaultRouter()
router.register(r"configuracoes", EmitenteConfigViewSet, basename="nfe-configuracao")
router.register(r"notas", NotaFiscalViewSet, basename="nfe-nota")

urlpatterns = [
    path("", include(router.urls)),
]
