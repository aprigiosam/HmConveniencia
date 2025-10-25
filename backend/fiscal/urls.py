from django.urls import path, include
from rest_framework.routers import DefaultRouter

from fiscal.views import EmpresaViewSet, ImportarNFeEntradaView, NotaFiscalViewSet

app_name = "fiscal"

router = DefaultRouter()
router.register(r'notas', NotaFiscalViewSet, basename='nota-fiscal')
router.register(r'empresas', EmpresaViewSet, basename='empresa')

urlpatterns = [
    path(
        "entradas/importar-xml",
        ImportarNFeEntradaView.as_view(),
        name="importar_nfe_entrada",
    ),
    path('fiscal/', include(router.urls)),
]
