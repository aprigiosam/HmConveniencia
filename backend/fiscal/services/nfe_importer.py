import logging
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import List, Optional, Tuple

import xmltodict
from django.db import transaction
from django.utils.dateparse import parse_datetime

from core.models import Alerta, Categoria, Fornecedor, Produto
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
            itens = self._processar_itens(nota_fiscal, estrutura, fornecedor)
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
            emitente_documento=_clean_document(
                (estrutura.get("emit") or {}).get("CNPJ") or (estrutura.get("emit") or {}).get("CPF")
            ),
            emitente_nome=(estrutura.get("emit") or {}).get("xNome", ""),
            destinatario_documento=_clean_document(dest.get("CNPJ") or dest.get("CPF")),
            destinatario_nome=dest.get("xNome", ""),
            valor_produtos=_safe_decimal((estrutura.get("total") or {}).get("ICMSTot", {}).get("vProd", "0")),
            valor_total=_safe_decimal((estrutura.get("total") or {}).get("ICMSTot", {}).get("vNF", "0")),
            valor_descontos=_safe_decimal((estrutura.get("total") or {}).get("ICMSTot", {}).get("vDesc", "0")),
            data_emissao=parse_datetime(ide.get("dhEmi") or ""),
            data_autorizacao=parse_datetime(protocolo.get("dhRecbto"))
            if protocolo and protocolo.get("dhRecbto") else None,
            fornecedor=fornecedor,
            cliente=None,
        )

        return nota

    def _processar_itens(
        self,
        nota: NotaFiscal,
        estrutura: dict,
        fornecedor: Optional[Fornecedor],
    ) -> List[NotaItem]:
        itens_nfe = _ensure_list(estrutura.get("det"))
        if not itens_nfe:
            raise ImportNFeError("NF-e sem itens.")

        itens_criados: List[NotaItem] = []

        for det in itens_nfe:
            prod = det.get("prod") or {}
            if not prod:
                continue

            quantidade_bruta = _safe_decimal(prod.get("qCom", "0"))
            if quantidade_bruta <= 0:
                continue

            valor_unitario_bruto = _safe_decimal(prod.get("vUnCom", "0"))
            valor_total = self._calcular_valor_total_item(det)
            valor_desconto = _safe_decimal(prod.get("vDesc", "0"))

            (
                quantidade,
                unidade,
                valor_unitario,
                categoria,
                codigo_barras,
            ) = self._normalizar_item(
                prod,
                quantidade_bruta,
                valor_total,
                valor_unitario_bruto,
            )

            if quantidade <= 0:
                logger.warning(
                    "Item %s com quantidade convertida inválida (qCom=%s). Ignorado.",
                    prod.get("cProd"),
                    quantidade_bruta,
                )
                continue

            produto = self._localizar_ou_criar_produto(
                prod,
                valor_unitario,
                codigo_barras,
                categoria,
                fornecedor,
            )

            item = NotaItem.objects.create(
                nota=nota,
                produto=produto,
                codigo_produto=str(prod.get("cProd", ""))[:60],
                descricao=prod.get("xProd", "")[:255],
                ncm=str(prod.get("NCM", ""))[:8],
                cfop=str(prod.get("CFOP", ""))[:4],
                cest=str(prod.get("CEST", ""))[:7],
                unidade=unidade,
                quantidade=quantidade,
                valor_unitario=valor_unitario if valor_unitario > 0 else Decimal("0.000001"),
                valor_total=valor_total,
                valor_desconto=valor_desconto,
            )
            itens_criados.append(item)

        return itens_criados

    def _calcular_valor_total_item(self, det: dict) -> Decimal:
        prod = det.get("prod") or {}

        valor_total = (
            _safe_decimal(prod.get("vProd", "0"))
            + _safe_decimal(prod.get("vFrete", "0"))
            + _safe_decimal(prod.get("vSeg", "0"))
            + _safe_decimal(prod.get("vOutro", "0"))
            - _safe_decimal(prod.get("vDesc", "0"))
        )

        valor_total += self._somar_impostos_para_custo(det)

        return valor_total if valor_total >= 0 else Decimal("0")

    def _somar_impostos_para_custo(self, det: dict) -> Decimal:
        imposto = det.get("imposto") or {}
        if not imposto:
            return Decimal("0")

        total_impostos = Decimal("0")

        icms_info = imposto.get("ICMS") or {}
        if isinstance(icms_info, dict):
            for dados in icms_info.values():
                if not isinstance(dados, dict):
                    continue

                valor_icms_st = dados.get("vICMSST")
                if valor_icms_st in (None, "", "null"):
                    valor_icms_st = dados.get("vST")
                if valor_icms_st not in (None, "", "null"):
                    total_impostos += _safe_decimal(valor_icms_st)

                for campo in ("vFCPST", "vFCP", "vFCPSTRet"):
                    valor = dados.get(campo)
                    if valor not in (None, "", "null"):
                        total_impostos += _safe_decimal(valor)

        icms_uf_dest = imposto.get("ICMSUFDest") or {}
        if isinstance(icms_uf_dest, dict):
            for campo in ("vICMSUFDest", "vICMSUFRemet", "vFCPUFDest"):
                valor = icms_uf_dest.get(campo)
                if valor not in (None, "", "null"):
                    total_impostos += _safe_decimal(valor)

        ipi_info = imposto.get("IPI") or {}
        if isinstance(ipi_info, dict):
            valor_ipi = ipi_info.get("vIPI")
            if valor_ipi not in (None, "", "null"):
                total_impostos += _safe_decimal(valor_ipi)
            else:
                for dados in ipi_info.values():
                    if isinstance(dados, dict):
                        valor_ipi_item = dados.get("vIPI") or dados.get("vIPIDevol")
                        if valor_ipi_item not in (None, "", "null"):
                            total_impostos += _safe_decimal(valor_ipi_item)

        pis_st = imposto.get("PISST") or {}
        if isinstance(pis_st, dict):
            if str(pis_st.get("indSomaPISST", "1")).strip() != "0":
                valor_pis_st = pis_st.get("vPIS")
                if valor_pis_st not in (None, "", "null"):
                    total_impostos += _safe_decimal(valor_pis_st)

        cofins_st = imposto.get("COFINSST") or {}
        if isinstance(cofins_st, dict):
            if str(cofins_st.get("indSomaCOFINSST", "1")).strip() != "0":
                valor_cofins_st = cofins_st.get("vCOFINS")
                if valor_cofins_st not in (None, "", "null"):
                    total_impostos += _safe_decimal(valor_cofins_st)

        return total_impostos

    def _localizar_ou_criar_produto(
        self,
        prod: dict,
        valor_unitario: Decimal,
        codigo_barras: str,
        categoria: Optional[Categoria],
        fornecedor: Optional[Fornecedor],
    ) -> Produto:
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
            if categoria and produto.categoria_id != categoria.id:
                produto.categoria = categoria
            if fornecedor and produto.fornecedor_id != (fornecedor.id if fornecedor else None):
                produto.fornecedor = fornecedor
            produto.empresa = self.empresa
            update_fields = ["codigo_barras", "preco_custo", "empresa", "updated_at"]
            if categoria:
                update_fields.append("categoria")
            if fornecedor:
                update_fields.append("fornecedor")
            produto.save(update_fields=update_fields)
        else:
            produto = Produto.objects.create(
                empresa=self.empresa,
                nome=descricao or "Produto importado NF-e",
                preco=Decimal("0.00"),
                preco_custo=valor_unitario if valor_unitario > 0 else Decimal("0.00"),
                estoque=Decimal("0"),
                codigo_barras=codigo_barras,
                ativo=True,
                categoria=categoria,
                fornecedor=fornecedor,
            )
            self._criar_alerta_produto_sem_preco(produto)

        return produto

    def _criar_alerta_produto_sem_preco(self, produto: Produto) -> None:
        if produto.preco and produto.preco > 0:
            return

        Alerta.objects.update_or_create(
            empresa=self.empresa,
            produto=produto,
            tipo="PRODUTO_SEM_PRECO",
            defaults={
                "prioridade": "MEDIA",
                "titulo": f"Defina o preço de venda de {produto.nome}",
                "mensagem": (
                    "Produto importado sem preço de venda. "
                    "Atualize o valor antes de disponibilizar no PDV."
                ),
                "lido": False,
                "resolvido": False,
                "notificado": False,
            },
        )

    def _normalizar_item(
        self,
        prod: dict,
        quantidade_bruta: Decimal,
        valor_total: Decimal,
        valor_unitario_bruto: Decimal,
    ) -> Tuple[Decimal, str, Decimal, Optional[Categoria], str]:
        unidade_nf = (prod.get("uCom") or "").upper()
        multiplicador_unidade = self._multiplicador_unidade(unidade_nf)
        quantidade_basica = quantidade_bruta * multiplicador_unidade

        unidade_trib = (prod.get("uTrib") or "").upper()
        quantidade_trib = _safe_decimal(prod.get("qTrib", "0"))
        multiplicador_trib = self._multiplicador_unidade(unidade_trib)
        quantidade_trib_convertida = quantidade_trib * multiplicador_trib

        if self._deve_usar_quantidade_tributavel(
            quantidade_basica,
            quantidade_trib_convertida,
            unidade_nf,
            unidade_trib,
        ):
            quantidade_convertida = quantidade_trib_convertida
            unidade_final = unidade_trib[:6] if unidade_trib else "UN"
        else:
            pack_size = self._detectar_pack_size(prod)
            if pack_size and pack_size > 0:
                quantidade_convertida = quantidade_basica / pack_size
                unidade_final = "UN"
            else:
                quantidade_convertida = quantidade_basica
                unidade_final = unidade_nf[:6] if unidade_nf else "UN"

        if quantidade_convertida <= 0 and quantidade_trib_convertida > 0:
            quantidade_convertida = quantidade_trib_convertida
            unidade_final = unidade_trib[:6] if unidade_trib else unidade_final

        if quantidade_convertida <= 0:
            quantidade_convertida = quantidade_basica
            unidade_final = unidade_nf[:6] if unidade_nf else unidade_final

        if quantidade_convertida <= 0:
            quantidade_convertida = quantidade_basica or Decimal("0")

        if quantidade_convertida > 0:
            valor_unitario = valor_total / quantidade_convertida
        else:
            valor_unitario = valor_unitario_bruto if valor_unitario_bruto > 0 else Decimal("0.000001")

        categoria = self._identificar_categoria(prod)
        codigo_barras = self._obter_codigo_barras(prod)

        return (
            quantidade_convertida,
            unidade_final,
            valor_unitario,
            categoria,
            codigo_barras,
        )

    def _multiplicador_unidade(self, unidade: str) -> Decimal:
        if unidade == "MIL":
            return Decimal("1000")
        if unidade == "DZ":
            return Decimal("12")
        if unidade in {"TH", "MILHEIRO"}:
            return Decimal("1000")
        return Decimal("1")

    def _deve_usar_quantidade_tributavel(
        self,
        quantidade_basica: Decimal,
        quantidade_trib: Decimal,
        unidade_nf: str,
        unidade_trib: str,
    ) -> bool:
        if quantidade_trib <= 0:
            return False
        if quantidade_basica <= 0:
            return True

        try:
            ratio = quantidade_trib / quantidade_basica
        except (InvalidOperation, ZeroDivisionError):
            ratio = Decimal("0")

        if ratio >= Decimal("1.5"):
            return True

        if unidade_trib and unidade_nf and unidade_trib != unidade_nf and ratio > Decimal("1.0"):
            return True

        return False

    def _detectar_pack_size(self, prod: dict) -> Optional[Decimal]:
        ncm = str(prod.get("NCM", "")).strip()
        if ncm == "24022000":
            return Decimal("20")

        descricao = prod.get("xProd", "") or ""
        match = re.search(r"(\d{2})\b(?!.*\d)", descricao)
        if match:
            try:
                valor = int(match.group(1))
                if valor > 1:
                    return Decimal(valor)
            except ValueError:
                pass
        return None

    def _identificar_categoria(self, prod: dict) -> Optional[Categoria]:
        """
        Identifica ou cria categoria baseada no NCM do produto.
        Agora com validade padrão automática!
        """
        ncm = str(prod.get("NCM", "")).strip()
        if not ncm:
            return None

        # Mapeamento NCM → (Categoria, Validade Padrão em dias)
        ncm_map = {
            # Bebidas
            "22021000": ("Refrigerantes", 180),  # Refrigerantes
            "22029900": ("Bebidas", 180),  # Outras bebidas não alcoólicas
            "22030000": ("Cervejas", 180),  # Cervejas

            # Laticínios
            "04012010": ("Leite", 15),  # Leite UHT
            "04012090": ("Leite", 15),  # Outros leites
            "04061000": ("Queijos", 30),  # Queijos frescos
            "04069000": ("Queijos", 60),  # Outros queijos
            "04051000": ("Manteiga", 60),  # Manteiga
            "04031000": ("Iogurte", 30),  # Iogurtes

            # Carnes e Frios
            "02013000": ("Carne Bovina", 90),  # Carne bovina fresca
            "02023000": ("Carne Bovina", 90),  # Carne bovina congelada
            "01012100": ("Carne Suína", 90),  # Carne suína
            "02071100": ("Aves", 90),  # Carne de frango
            "16010000": ("Embutidos", 60),  # Linguiças e similares
            "16020000": ("Embutidos", 60),  # Outras preparações de carne

            # Panificação e Massas
            "19059090": ("Biscoitos", 90),  # Biscoitos e bolachas
            "19052000": ("Biscoitos", 120),  # Biscoitos tipo wafer
            "19053100": ("Biscoitos", 90),  # Biscoitos tipo cookie
            "19021100": ("Massas", 365),  # Massas secas
            "19022000": ("Massas", 30),  # Massas recheadas

            # Congelados
            "21069090": ("Congelados", 365),  # Alimentos preparados congelados
            "19041000": ("Cereais", 365),  # Cereais preparados

            # Doces e Chocolates
            "17049000": ("Doces", 180),  # Balas e confeitos
            "18063100": ("Chocolates", 180),  # Chocolates recheados
            "18069000": ("Chocolates", 180),  # Outros chocolates

            # Tabaco
            "24022000": ("Cigarros", 365),  # Cigarros

            # Higiene e Limpeza
            "33074100": ("Higiene Pessoal", 1095),  # Perfumes e águas de colônia (3 anos)
            "34011100": ("Limpeza", 730),  # Sabões (2 anos)
            "34022000": ("Limpeza", 730),  # Detergentes (2 anos)

            # Snacks e Salgadinhos
            "20052000": ("Snacks", 180),  # Batata chips
            "19059010": ("Snacks", 120),  # Salgadinhos
        }

        categoria_info = ncm_map.get(ncm)

        if not categoria_info:
            # Se NCM não mapeado, tenta identificar pelo grupo (2 primeiros dígitos)
            grupo_ncm = ncm[:2]
            grupo_map = {
                "22": ("Bebidas", 180),
                "04": ("Laticínios", 30),
                "02": ("Carnes", 90),
                "19": ("Alimentos Secos", 180),
                "21": ("Alimentos Preparados", 90),
                "17": ("Açúcares e Doces", 180),
                "33": ("Perfumaria", 730),
                "34": ("Limpeza", 730),
            }
            categoria_info = grupo_map.get(grupo_ncm)

        if not categoria_info:
            return None

        categoria_nome, validade_dias = categoria_info

        categoria, created = Categoria.objects.get_or_create(
            empresa=self.empresa,
            nome=categoria_nome,
            defaults={
                "ativo": True,
                "validade_dias_padrao": validade_dias
            },
        )

        # Se categoria já existe mas não tem validade padrão, atualiza
        if not created and not categoria.validade_dias_padrao:
            categoria.validade_dias_padrao = validade_dias
            categoria.save(update_fields=["validade_dias_padrao"])
            logger.info(f"Categoria {categoria_nome} atualizada com validade padrão: {validade_dias} dias")
        elif created:
            logger.info(f"Categoria {categoria_nome} criada com validade padrão: {validade_dias} dias")

        return categoria

    def _obter_codigo_barras(self, prod: dict) -> str:
        codigo = prod.get("cEANTrib") or prod.get("cEAN") or ""
        return str(codigo).strip()

    def _criar_movimentacao_estoque(self, nota: NotaFiscal, itens: List[NotaItem]) -> None:
        """
        Cria movimentação de estoque e lotes com validade estimada (se aplicável)
        Sistema Híbrido: calcula validade baseado na categoria ou deixa None
        """
        from core.models import Lote
        from datetime import date, timedelta

        for item in itens:
            produto = item.produto
            quantidade = item.quantidade

            # Calcula data de validade estimada baseada na categoria
            data_validade_estimada = None
            validade_estimada = False
            observacoes_lote = f"Lote criado via NF-e {nota.numero}/{nota.serie}"

            if produto.categoria and produto.categoria.validade_dias_padrao:
                data_validade_estimada = date.today() + timedelta(
                    days=produto.categoria.validade_dias_padrao
                )
                validade_estimada = True
                observacoes_lote += (
                    f" - Validade ESTIMADA ({produto.categoria.validade_dias_padrao} dias). "
                    "CONFERIR embalagem física!"
                )
            else:
                observacoes_lote += " - SEM validade estimada. CONFERIR e atualizar!"

            # Cria o lote
            lote = Lote.objects.create(
                produto=produto,
                numero_lote=f"NFE-{nota.numero}-{item.codigo_produto[:20]}",
                quantidade=quantidade,
                data_validade=data_validade_estimada,
                fornecedor=nota.fornecedor,
                preco_custo_lote=item.valor_unitario,
                observacoes=observacoes_lote,
                empresa=self.empresa,
                ativo=True,
                validade_estimada=validade_estimada,
                conferido=False,  # Precisa conferir
            )

            # Registra movimentação de estoque
            EstoqueMovimento.objects.create(
                empresa=self.empresa,
                produto=produto,
                nota=nota,
                origem=EstoqueOrigem.ENTRADA,
                quantidade=quantidade,
                custo_unitario=item.valor_unitario,
                observacao=f"Entrada NF-e {nota.chave_acesso} - Lote #{lote.id}",
            )

            # Atualiza estoque total do produto
            produto.estoque = (produto.estoque or Decimal("0")) + quantidade
            produto.save(update_fields=["estoque", "updated_at"])

            logger.info(
                f"NF-e {nota.numero}: Lote #{lote.id} criado para {produto.nome} "
                f"({quantidade} un, validade: {'ESTIMADA' if validade_estimada else 'NÃO DEFINIDA'})"
            )

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
