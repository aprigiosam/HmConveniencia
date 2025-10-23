import logging

from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from fiscal.models import Empresa
from fiscal.serializers import NotaFiscalSerializer
from fiscal.services.nfe_importer import ImportNFeError, NFeEntradaImporter

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
