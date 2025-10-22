import logging
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import List, Optional, Tuple

import xmltodict
from django.db import transaction
from django.utils.dateparse import parse_datetime

from core.models import Fornecedor, Produto
from fiscal.models import (
    AmbienteChoices,
    Empresa,
    EstoqueMovimento,
    EstoqueOrigem,
    NotaFiscal,
    NotaItem,
    NotaModelo,
    NotaStatus,
    NotaTipo,
    XMLArmazenado,
    XMLDocumentoTipo,
)

logger = logging.getLogger(__name__)


class ImportNFeError(Exception):
    """Erros específicos do processo de importação de NF-e."""


def _clean_document(value: Optional[str]) -> str:
    if not value:
        return ""
    return "".join(filter(str.isdigit, value))


def _safe_decimal(value, default: str = "0") -> Decimal:
    if value in (None, "", "null"):
        return Decimal(default)
    try:
        return Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError) as exc:
        raise ImportNFeError(f"Valor decimal inválido: {value}") from exc


def _ensure_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


@dataclass
class ImportResult:
    nota_fiscal: NotaFiscal
    itens_criados: List[NotaItem]


class NFeEntradaImporter:
    """
    Responsável por importar XML de NF-e de entrada (procNFe) e
    criar os registros fiscais/estoque correspondentes.
    """

    def __init__(self, empresa: Empresa):
        self.empresa = empresa

    def importar(self, xml_bytes: bytes, filename: Optional[str] = None) -> ImportResult:
        if not xml_bytes:
            raise ImportNFeError("Arquivo XML vazio.")

        xml_text = self._decode_xml(xml_bytes)

        estrutura, protocolo = self._parse_xml(xml_text)

        chave_acesso = self._obter_chave(estrutura, protocolo)
        if NotaFiscal.objects.filter(empresa=self.empresa, chave_acesso=chave_acesso).exists():
            raise ImportNFeError(f"Nota fiscal {chave_acesso} já importada.")

        with transaction.atomic():
            fornecedor = self._atualizar_ou_criar_fornecedor(estrutura)
            nota_fiscal = self._criar_nota_fiscal(
                estrutura=estrutura,
                protocolo=protocolo,
                fornecedor=fornecedor,
                xml_assinado=xml_text,
                chave_acesso=chave_acesso,
            )
            itens = self._processar_itens(nota_fiscal, estrutura)
            self._criar_movimentacao_estoque(nota_fiscal, itens)
            self._armazenar_xml(nota_fiscal, xml_text, chave_acesso, filename, protocolo)

        return ImportResult(nota_fiscal=nota_fiscal, itens_criados=itens)

    def _decode_xml(self, xml_bytes: bytes) -> str:
        try:
            return xml_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return xml_bytes.decode("latin-1")

    def _parse_xml(self, xml_text: str) -> Tuple[dict, Optional[dict]]:
        try:
            parsed = xmltodict.parse(xml_text)
        except Exception as exc:  # noqa: BLE001
            raise ImportNFeError("Não foi possível interpretar o XML enviado.") from exc

        if not parsed:
            raise ImportNFeError("XML inválido ou sem conteúdo.")

        nfe_proc = parsed.get("nfeProc") or parsed.get("nfe:procNFe")
        protocolo = None
        if nfe_proc:
            protocolo = nfe_proc.get("protNFe", {}).get("infProt")
            estrutura = nfe_proc.get("NFe") or nfe_proc.get("nfe:NFe")
        else:
            estrutura = parsed.get("NFe") or parsed.get("nfe:NFe")

        if not estrutura:
            raise ImportNFeError("Tag NFe não encontrada no XML.")

        inf_nfe = estrutura.get("infNFe") or estrutura.get("nfe:infNFe")
        if isinstance(inf_nfe, list):
            inf_nfe = inf_nfe[0]

        if not inf_nfe:
            raise ImportNFeError("Estrutura infNFe ausente no XML.")

        return inf_nfe, protocolo

    def _obter_chave(self, estrutura: dict, protocolo: Optional[dict]) -> str:
        if protocolo and protocolo.get("chNFe"):
            return protocolo["chNFe"]
        identificador = estrutura.get("@Id")
        if identificador and identificador.startswith("NFe"):
            return identificador[3:]
        raise ImportNFeError("Não foi possível determinar a chave de acesso da NF-e.")

    def _mapear_ambiente(self, valor: Optional[str]) -> str:
        if valor in ("1", 1):
            return AmbienteChoices.PRODUCAO
        return AmbienteChoices.HOMOLOGACAO

    def _status_a_partir_protocolo(self, protocolo: Optional[dict]) -> Tuple[str, str]:
        if not protocolo:
            return NotaStatus.EM_PROCESSAMENTO, ""

        codigo = str(protocolo.get("cStat", "")).strip()
        motivo = protocolo.get("xMot", "")

        if codigo in {"100", "150"}:
            return NotaStatus.AUTORIZADA, motivo
        if codigo in {"101", "151"}:
            return NotaStatus.CANCELADA, motivo
        if codigo:
            return NotaStatus.REJEITADA, motivo
        return NotaStatus.EM_PROCESSAMENTO, motivo

    def _atualizar_ou_criar_fornecedor(self, estrutura: dict) -> Optional[Fornecedor]:
        emitente = estrutura.get("emit") or {}
        cnpj = _clean_document(emitente.get("CNPJ"))
        if not cnpj:
            logger.warning("NF-e sem CNPJ do emitente; fornecedor não será vinculado.")
            return None

        defaults = {
            "nome": emitente.get("xNome", "")[:200] or "Fornecedor Desconhecido",
            "nome_fantasia": emitente.get("xFant", "")[:200],
            "telefone": "",
            "email": "",
            "endereco": self._montar_endereco(emitente.get("enderEmit") or {}),
            "observacoes": "",
            "ativo": True,
            "empresa": self.empresa,
        }

        fornecedor, created = Fornecedor.objects.get_or_create(
            empresa=self.empresa,
            cnpj=cnpj,
            defaults=defaults,
        )

        if not created:
            atualizou = False
            if emitente.get("xNome") and fornecedor.nome != emitente.get("xNome"):
                fornecedor.nome = emitente.get("xNome")[:200]
                atualizou = True
            if emitente.get("xFant") and fornecedor.nome_fantasia != emitente.get("xFant"):
                fornecedor.nome_fantasia = emitente.get("xFant")[:200]
                atualizou = True
            if atualizou:
                fornecedor.save(update_fields=["nome", "nome_fantasia", "updated_at"])

        return fornecedor

    def _montar_endereco(self, endereco: dict) -> str:
        if not endereco:
            return ""
        partes = [
            endereco.get("xLgr"),
            endereco.get("nro"),
            endereco.get("xBairro"),
            endereco.get("xMun"),
            endereco.get("UF"),
            endereco.get("CEP"),
        ]
        return ", ".join(part for part in partes if part)

    def _criar_nota_fiscal(
        self,
        estrutura: dict,
        protocolo: Optional[dict],
        fornecedor: Optional[Fornecedor],
        xml_assinado: str,
        chave_acesso: str,
    ) -> NotaFiscal:
        ide = estrutura.get("ide") or {}
        dest = estrutura.get("dest") or {}

        modelo = ide.get("mod") or NotaModelo.MODELO_55
        ambiente = self._mapear_ambiente(ide.get("tpAmb") or protocolo.get("tpAmb") if protocolo else None)
        status, motivo = self._status_a_partir_protocolo(protocolo)

        nota = NotaFiscal.objects.create(
            empresa=self.empresa,
            tipo=NotaTipo.NFE,
            modelo=str(modelo),
            serie=int(ide.get("serie", 0) or 0),
            numero=int(ide.get("nNF", 0) or 0),
            chave_acesso=chave_acesso,
            status=status,
            ambiente=ambiente,
            protocolo=protocolo.get("nProt", "") if protocolo else "",
            motivo_rejeicao=motivo or "",
            xml_assinado=xml_assinado,
            emitente_documento=_clean_document((estrutura.get("emit") or {}).get("CNPJ") or (estrutura.get("emit") or {}).get("CPF")),
            emitente_nome=(estrutura.get("emit") or {}).get("xNome", ""),
            destinatario_documento=_clean_document(dest.get("CNPJ") or dest.get("CPF")),
            destinatario_nome=dest.get("xNome", ""),
            valor_produtos=_safe_decimal((estrutura.get("total") or {}).get("ICMSTot", {}).get("vProd", "0")),
            valor_total=_safe_decimal((estrutura.get("total") or {}).get("ICMSTot", {}).get("vNF", "0")),
            valor_descontos=_safe_decimal((estrutura.get("total") or {}).get("ICMSTot", {}).get("vDesc", "0")),
            data_emissao=parse_datetime(ide.get("dhEmi") or ""),
            data_autorizacao=parse_datetime(protocolo.get("dhRecbto")) if protocolo and protocolo.get("dhRecbto") else None,
            fornecedor=fornecedor,
            cliente=None,
        )

        return nota

    def _processar_itens(self, nota: NotaFiscal, estrutura: dict) -> List[NotaItem]:
        itens_nfe = _ensure_list(estrutura.get("det"))
        if not itens_nfe:
            raise ImportNFeError("NF-e sem itens.")

        itens_criados: List[NotaItem] = []

        for det in itens_nfe:
            prod = det.get("prod") or {}
            if not prod:
                continue

            quantidade = _safe_decimal(prod.get("qCom", "0"))
            if quantidade <= 0:
                continue

            valor_unitario = _safe_decimal(prod.get("vUnCom", "0"))
            valor_total = _safe_decimal(prod.get("vProd", "0"))
            valor_desconto = _safe_decimal(prod.get("vDesc", "0"))

            produto = self._localizar_ou_criar_produto(prod, valor_unitario)

            item = NotaItem.objects.create(
                nota=nota,
                produto=produto,
                codigo_produto=str(prod.get("cProd", ""))[:60],
                descricao=prod.get("xProd", "")[:255],
                ncm=str(prod.get("NCM", ""))[:8],
                cfop=str(prod.get("CFOP", ""))[:4],
                cest=str(prod.get("CEST", ""))[:7],
                unidade=str(prod.get("uCom", ""))[:6],
                quantidade=quantidade,
                valor_unitario=valor_unitario if valor_unitario > 0 else Decimal("0.000001"),
                valor_total=valor_total,
                valor_desconto=valor_desconto,
            )
            itens_criados.append(item)

        return itens_criados

    def _localizar_ou_criar_produto(self, prod: dict, valor_unitario: Decimal) -> Produto:
        codigo_barras = prod.get("cEAN") or ""
        if codigo_barras.upper().startswith("SEM GTIN"):
            codigo_barras = ""

        descricao = prod.get("xProd", "")[:200]

        produto = None
        if codigo_barras:
            produto = Produto.objects.filter(
                empresa=self.empresa, codigo_barras=codigo_barras
            ).first()

        if not produto:
            produto = Produto.objects.filter(
                empresa=self.empresa, nome__iexact=descricao
            ).first()

        if produto:
            if produto.codigo_barras == "" and codigo_barras:
                produto.codigo_barras = codigo_barras
            if valor_unitario > 0:
                produto.preco_custo = valor_unitario
            produto.empresa = self.empresa
            produto.save(update_fields=["codigo_barras", "preco_custo", "empresa", "updated_at"])
        else:
            preco_para_venda = valor_unitario if valor_unitario > 0 else Decimal("0.01")
            produto = Produto.objects.create(
                empresa=self.empresa,
                nome=descricao or "Produto importado NF-e",
                preco=preco_para_venda,
                preco_custo=valor_unitario if valor_unitario > 0 else Decimal("0.00"),
                estoque=Decimal("0"),
                codigo_barras=codigo_barras,
                ativo=True,
            )

        return produto

    def _criar_movimentacao_estoque(self, nota: NotaFiscal, itens: List[NotaItem]) -> None:
        for item in itens:
            produto = item.produto
            quantidade = item.quantidade

            EstoqueMovimento.objects.create(
                empresa=self.empresa,
                produto=produto,
                nota=nota,
                origem=EstoqueOrigem.ENTRADA,
                quantidade=quantidade,
                custo_unitario=item.valor_unitario,
                observacao=f"Entrada NF-e {nota.chave_acesso}",
            )

            produto.estoque = (produto.estoque or Decimal("0")) + quantidade
            produto.save(update_fields=["estoque", "updated_at"])

    def _armazenar_xml(
        self,
        nota: NotaFiscal,
        xml_text: str,
        chave: str,
        filename: Optional[str],
        protocolo: Optional[dict],
    ) -> None:
        ambiente = protocolo.get("tpAmb") if protocolo else ""
        XMLArmazenado.objects.update_or_create(
            nota=nota,
            defaults={
                "tipo_documento": XMLDocumentoTipo.PROCNFE if protocolo else XMLDocumentoTipo.NOTA,
                "ambiente": self._mapear_ambiente(ambiente),
                "chave_acesso": chave,
                "xml_texto": xml_text,
                "storage_path": filename or "",
            },
        )
