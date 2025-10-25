import logging

from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from fiscal.models import Empresa, NotaFiscal
from fiscal.serializers import EmpresaSerializer, NotaFiscalSerializer
from fiscal.services.nfe_importer import ImportNFeError, NFeEntradaImporter
from core.models import Lote

logger = logging.getLogger(__name__)


class ImportarNFeEntradaView(APIView):
    """
    Endpoint responsável por receber um XML de NF-e de entrada, persistir as informações
    fiscais e atualizar o estoque com base no documento.
    """

    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        arquivo = request.FILES.get("xml") or request.data.get("xml")
        if not arquivo:
            return Response(
                {"detail": "Envie o arquivo XML usando o campo 'xml'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        xml_bytes = arquivo.read()
        if not xml_bytes:
            return Response(
                {"detail": "Arquivo XML vazio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            empresa = self._obter_empresa(request)
        except Empresa.DoesNotExist:
            return Response(
                {"detail": "Nenhuma empresa configurada. Cadastre uma empresa antes de importar notas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        importer = NFeEntradaImporter(empresa=empresa)

        try:
            resultado = importer.importar(xml_bytes, filename=getattr(arquivo, "name", None))
        except ImportNFeError as exc:
            logger.warning("Erro ao importar NF-e: %s", exc)
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:  # noqa: BLE001
            logger.exception("Falha inesperada na importação da NF-e")
            return Response(
                {"detail": "Falha inesperada ao processar a NF-e."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = NotaFiscalSerializer(resultado.nota_fiscal)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _obter_empresa(self, request) -> Empresa:
        empresa_id = (
            request.headers.get("X-Empresa-Id")
            or request.query_params.get("empresa_id")
            or request.data.get("empresa_id")
        )
        if empresa_id:
            return Empresa.objects.get(id=empresa_id)

        empresa = Empresa.objects.first()
        if not empresa:
            raise Empresa.DoesNotExist
        return empresa


class NotaFiscalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para listar e gerenciar notas fiscais importadas.
    Permite apenas leitura e exclusão (com reversão de estoque).
    """
    queryset = NotaFiscal.objects.all()
    serializer_class = NotaFiscalSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtra por empresa
        empresa_id = (
            self.request.headers.get("X-Empresa-Id")
            or self.request.query_params.get("empresa_id")
        )
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
        else:
            empresa = Empresa.objects.first()
            if empresa:
                queryset = queryset.filter(empresa=empresa)

        # Filtra por tipo (NFE ou NFCE)
        tipo = self.request.query_params.get("tipo")
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        # Filtra por status
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filtra por fornecedor
        fornecedor_id = self.request.query_params.get("fornecedor_id")
        if fornecedor_id:
            queryset = queryset.filter(fornecedor_id=fornecedor_id)

        return queryset.select_related("empresa", "fornecedor").prefetch_related("itens__produto")

    def destroy(self, request, *args, **kwargs):
        """
        Exclui a nota fiscal e reverte todas as alterações de estoque.
        Similar ao inventário, desfaz tudo que foi feito.
        """
        nota = self.get_object()

        with transaction.atomic():
            # Busca todos os lotes criados por esta nota
            lotes = Lote.objects.filter(
                numero_lote__startswith=f"NFE-{nota.numero}-"
            )

            total_lotes = lotes.count()

            logger.warning(
                f"Excluindo NF-e {nota.numero}/{nota.serie} (ID: {nota.id}). "
                f"Revertendo {total_lotes} lote(s) e movimentações de estoque."
            )

            # Para cada lote, reverte o estoque do produto
            for lote in lotes:
                produto = lote.produto
                quantidade_lote = lote.quantidade

                # Remove a quantidade do estoque total
                produto.estoque -= quantidade_lote
                if produto.estoque < 0:
                    produto.estoque = 0
                produto.save(update_fields=["estoque", "updated_at"])

                logger.info(
                    f"Lote #{lote.id} ({produto.nome}): -{quantidade_lote} un "
                    f"(estoque agora: {produto.estoque})"
                )

            # Deleta os lotes (CASCADE vai deletar os EstoqueMovimento relacionados)
            lotes.delete()

            # Deleta a nota (CASCADE vai deletar itens e XMLs)
            nota.delete()

            logger.info(f"NF-e {nota.numero}/{nota.serie} excluída com sucesso")

        return Response(
            {
                "detail": (
                    f"NF-e {nota.numero}/{nota.serie} excluída com sucesso. "
                    f"{total_lotes} lote(s) removido(s) e estoque revertido."
                )
            },
            status=status.HTTP_200_OK,
        )


class EmpresaViewSet(viewsets.ModelViewSet):
    """
    Permite cadastrar e gerenciar a empresa que utiliza o sistema.
    Normalmente haverá apenas um registro.
    """

    queryset = Empresa.objects.all().order_by("created_at")
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        empresa_id = (
            self.request.headers.get("X-Empresa-Id")
            or self.request.query_params.get("empresa_id")
        )
        if empresa_id:
            queryset = queryset.filter(id=empresa_id)
        return queryset
