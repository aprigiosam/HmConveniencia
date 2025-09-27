from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import EmitenteConfig, NotaFiscal
from .serializers import (
    EmitenteConfigSerializer,
    NotaFiscalCreateSerializer,
    NotaFiscalSerializer,
)
from .services import criar_nfe_para_venda, gerar_preview_dados, simular_autorizacao


class EmitenteConfigViewSet(viewsets.ModelViewSet):
    queryset = EmitenteConfig.objects.select_related("loja")
    serializer_class = EmitenteConfigSerializer
    permission_classes = [permissions.IsAuthenticated]


class NotaFiscalViewSet(viewsets.ModelViewSet):
    queryset = NotaFiscal.objects.select_related("config", "venda", "config__loja").prefetch_related("itens")
    serializer_class = NotaFiscalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return NotaFiscalCreateSerializer
        return super().get_serializer_class()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        venda = serializer.validated_data["venda"]
        config = serializer.validated_data["config"]

        nota = criar_nfe_para_venda(venda=venda, config=config)
        simular_autorizacao(nota)

        output = NotaFiscalSerializer(instance=nota, context=self.get_serializer_context())
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["get"], url_path="preview")
    def preview(self, request, pk=None):
        nota = self.get_object()
        if nota.venda:
            dados = gerar_preview_dados(nota.venda)
        else:
            dados = {}
        return Response(dados)

    @action(detail=True, methods=["post"], url_path="simular-autorizacao")
    def autorizar(self, request, pk=None):
        nota = self.get_object()
        simular_autorizacao(nota)
        serializer = NotaFiscalSerializer(instance=nota, context=self.get_serializer_context())
        return Response(serializer.data)
