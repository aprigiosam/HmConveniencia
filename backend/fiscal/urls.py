from django.urls import path

from fiscal.views import ImportarNFeEntradaView

app_name = "fiscal"

urlpatterns = [
    path(
        "entradas/importar-xml",
        ImportarNFeEntradaView.as_view(),
        name="importar_nfe_entrada",
    ),
]
