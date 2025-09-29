from __future__ import annotations

import random
from datetime import datetime
from decimal import Decimal
from typing import Dict, List

from django.db import transaction
from django.utils import timezone

from apps.sales.models import ItemVenda, Venda

from .models import EmitenteConfig, NotaFiscal, NotaFiscalItem


def _gerar_chave_fake(config: EmitenteConfig, numero: int) -> str:
    agora = timezone.now()
    data = agora.strftime("%y%m")
    cnpj = ''.join(filter(str.isdigit, config.loja.cnpj))[:14].zfill(14)
    modelo = "55"  # NF-e modelo 55 padrão
    serie = str(config.serie).zfill(3)
    numero_str = str(numero).zfill(9)
    tipo_emissao = "1"
    codigo = str(random.randint(10000000, 99999999)).zfill(8)
    chave_base = f"{data}{cnpj}{modelo}{serie}{numero_str}{tipo_emissao}{codigo}"
    # Garantir que temos exatamente 43 dígitos antes do DV
    chave_base = chave_base[:43].zfill(43)
    # Digito verificador (módulo 11 simplificado)
    pesos = [4, 3, 2, 9, 8, 7, 6, 5]
    soma = 0
    for i, char in enumerate(chave_base):
        peso = pesos[i % len(pesos)]
        soma += int(char) * peso
    resto = soma % 11
    dv = 11 - resto
    if dv >= 10:
        dv = 0
    return chave_base + str(dv)


@transaction.atomic
def criar_nfe_para_venda(venda: Venda, config: EmitenteConfig) -> NotaFiscal:
    if not venda:
        raise ValueError("Venda é obrigatória")

    numero = config.proximo_numero
    nota = NotaFiscal.objects.create(
        config=config,
        venda=venda,
        numero=numero,
        serie=config.serie,
        ambiente=config.ambiente,
        status=NotaFiscal.Status.RASCUNHO,
    )

    itens_venda = ItemVenda.objects.filter(venda=venda).select_related("produto")

    total_produtos = Decimal("0")
    lista_itens: List[NotaFiscalItem] = []

    for item in itens_venda:
        produto = item.produto
        valor_total = item.valor_total
        total_produtos += valor_total
        lista_itens.append(
            NotaFiscalItem(
                nota=nota,
                produto_nome=produto.nome,
                produto_sku=produto.sku,
                ncm=getattr(produto, "ncm", ""),
                cfop="5102",  # CFOP padrão para venda interna de mercadoria adquirida
                unidade=produto.unidade,
                quantidade=item.quantidade,
                valor_unitario=item.preco_unitario,
                valor_total=item.valor_total,
                dados_impostos={
                    "icms": {
                        "aliquota": 18,
                        "valor": float(round(item.valor_total * Decimal("0.18"), 2)),
                    }
                },
            )
        )

    NotaFiscalItem.objects.bulk_create(lista_itens)

    nota.total_produtos = total_produtos
    nota.total_notafiscal = total_produtos  # simplificado (sem frete/desc)
    nota.impostos_totais = total_produtos * Decimal("0.18")
    nota.chave_acesso = _gerar_chave_fake(config, numero)
    nota.status = NotaFiscal.Status.EM_PROCESSAMENTO
    nota.save()

    config.proximo_numero = numero + 1
    config.save(update_fields=["proximo_numero", "updated_at"])

    return nota


def simular_autorizacao(nota: NotaFiscal) -> NotaFiscal:
    nota.status = NotaFiscal.Status.AUTORIZADA
    nota.protocolo_autorizacao = f"{datetime.now().strftime('%Y%m%d%H%M%S')}123"
    nota.dh_autorizacao = timezone.now()
    nota.motivo_status = "Autorizado em modo simulado"
    nota.xml_autorizado = "<!-- XML autorizado mock -->"
    nota.save(update_fields=[
        "status",
        "protocolo_autorizacao",
        "dh_autorizacao",
        "motivo_status",
        "xml_autorizado",
        "updated_at",
    ])
    return nota


def gerar_preview_dados(venda: Venda) -> Dict[str, str]:
    total = sum(item.valor_total for item in venda.itens.all())
    return {
        "numero_venda": venda.numero_venda,
        "cliente": venda.cliente.nome if venda.cliente else "Consumidor Final",
        "total": f"R$ {total:.2f}",
    }
