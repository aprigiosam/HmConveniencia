from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db.models import F, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.catalog.models import Produto
from apps.core.models import Cliente
from apps.sales.models import ItemVenda, Venda

Currency = Decimal


def _format_currency(valor: Decimal) -> str:
    valor = valor or Decimal("0")
    return f"R$ {valor:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def _format_percent(valor: Optional[Decimal]) -> str:
    if valor is None:
        return "-"
    return f"{valor:+.0f}%".replace("+", "+").replace("-", "-")


def _calculate_variation(atual: Decimal, anterior: Decimal) -> Optional[Decimal]:
    if anterior is None or anterior == 0:
        return None
    return ((atual - anterior) / anterior) * 100


def make_dashboard_metrics(loja_id: Optional[int] = None) -> Dict[str, Any]:
    hoje = timezone.localdate()
    ontem = hoje - timedelta(days=1)
    inicio_30_dias = hoje - timedelta(days=30)

    filtro_loja = {"loja_id": loja_id} if loja_id else {}

    vendas_hoje_qs = Venda.objects.filter(status=Venda.Status.FINALIZADA, created_at__date=hoje, **filtro_loja)
    vendas_ontem_qs = Venda.objects.filter(status=Venda.Status.FINALIZADA, created_at__date=ontem, **filtro_loja)

    faturamento_hoje = vendas_hoje_qs.aggregate(total=Coalesce(Sum("valor_total"), Value(Decimal("0"))))["total"]
    faturamento_ontem = vendas_ontem_qs.aggregate(total=Coalesce(Sum("valor_total"), Value(Decimal("0"))))["total"]

    quantidade_vendas_hoje = vendas_hoje_qs.count()
    quantidade_vendas_ontem = vendas_ontem_qs.count()

    ticket_medio = Decimal("0")
    if quantidade_vendas_hoje:
        ticket_medio = faturamento_hoje / Decimal(quantidade_vendas_hoje)

    ticket_ontem = Decimal("0")
    if quantidade_vendas_ontem:
        ticket_ontem = faturamento_ontem / Decimal(quantidade_vendas_ontem)

    variacao_faturamento = _calculate_variation(faturamento_hoje, faturamento_ontem)
    variacao_vendas = _calculate_variation(Decimal(quantidade_vendas_hoje), Decimal(quantidade_vendas_ontem))
    variacao_ticket = _calculate_variation(ticket_medio, ticket_ontem)

    clientes_qs = Cliente.objects.filter(ativo=True)
    if loja_id:
        clientes_qs = clientes_qs.filter(vendas__loja_id=loja_id).distinct()

    total_clientes = clientes_qs.count()
    novos_clientes = clientes_qs.filter(created_at__gte=inicio_30_dias).count()

    produtos_qs = Produto.objects.filter(ativo=True)
    if loja_id:
        produtos_qs = produtos_qs.filter(lotes__loja_id=loja_id)

    produtos_qs = produtos_qs.annotate(
        estoque_total=Coalesce(Sum("lotes__quantidade", filter=Q(lotes__loja_id=loja_id) if loja_id else Q()), Value(0)),
    )

    rupturas = []
    for produto in produtos_qs:
        estoque_minimo = produto.estoque_minimo or 0
        estoque_atual = produto.estoque_total or 0
        if estoque_minimo and estoque_atual < estoque_minimo:
            rupturas.append(
                {
                    "sku": produto.sku,
                    "nome": produto.nome,
                    "estoque": float(estoque_atual),
                    "estoque_display": f"{estoque_atual:.0f} un",
                    "estoque_minimo": estoque_minimo,
                }
            )

    rupturas.sort(key=lambda item: item["estoque"])

    itens_venda_qs = ItemVenda.objects.filter(
        venda__status=Venda.Status.FINALIZADA,
        venda__created_at__date__gte=inicio_30_dias,
    )
    if loja_id:
        itens_venda_qs = itens_venda_qs.filter(venda__loja_id=loja_id)

    top_produtos: List[Dict[str, Any]] = []

    produtos_agrupados = (
        itens_venda_qs.values("produto__sku", "produto__nome", "produto__preco_custo", "produto__preco_venda")
        .annotate(
            quantidade_total=Coalesce(Sum("quantidade"), Value(Decimal("0"))),
            faturamento_total=Coalesce(Sum("valor_total"), Value(Decimal("0"))),
        )
        .order_by("-faturamento_total")[:5]
    )

    for item in produtos_agrupados:
        quantidade = item["quantidade_total"] or Decimal("0")
        faturamento = item["faturamento_total"] or Decimal("0")
        custo_unitario = item["produto__preco_custo"] or Decimal("0")
        receita = faturamento
        custo_total = custo_unitario * quantidade
        margem = Decimal("0")
        if receita > 0:
            margem = ((receita - custo_total) / receita) * 100
        margem_percentual = float(round(margem, 2)) if margem else 0.0
        margem_display = f"{margem_percentual:.0f}%" if margem else "0%"
        top_produtos.append(
            {
                "sku": item["produto__sku"],
                "nome": item["produto__nome"],
                "quantidade": float(quantidade),
                "faturamento": float(receita),
                "faturamento_display": _format_currency(receita),
                "margem_percentual": margem_percentual,
                "margem_display": margem_display,
            }
        )

    kpis = [
        {
            "id": "faturamento",
            "title": "Faturamento hoje",
            "value": float(faturamento_hoje),
            "value_display": _format_currency(faturamento_hoje),
            "change_display": f"{_format_percent(variacao_faturamento)} vs. ontem" if variacao_faturamento is not None else "Sem histórico",
            "trend": "up" if variacao_faturamento and variacao_faturamento > 0 else "down" if variacao_faturamento and variacao_faturamento < 0 else "neutral",
        },
        {
            "id": "vendas",
            "title": "Vendas",
            "value": quantidade_vendas_hoje,
            "value_display": f"{quantidade_vendas_hoje} cupons",
            "change_display": f"{_format_percent(variacao_vendas)}" if variacao_vendas is not None else "Sem histórico",
            "trend": "up" if variacao_vendas and variacao_vendas > 0 else "down" if variacao_vendas and variacao_vendas < 0 else "neutral",
        },
        {
            "id": "clientes_fidelidade",
            "title": "Clientes fidelidade",
            "value": total_clientes,
            "value_display": f"{total_clientes}",
            "change_display": f"+{novos_clientes} novos (30d)" if novos_clientes else "Sem novos (30d)",
            "trend": "up" if novos_clientes else "neutral",
        },
        {
            "id": "rupturas",
            "title": "Rupturas",
            "value": len(rupturas),
            "value_display": f"{len(rupturas)} itens",
            "change_display": "Monitorar estoque",
            "trend": "down" if rupturas else "up",
        },
        {
            "id": "ticket_medio",
            "title": "Ticket médio",
            "value": float(ticket_medio),
            "value_display": _format_currency(ticket_medio),
            "change_display": f"{_format_percent(variacao_ticket)}" if variacao_ticket is not None else "Sem histórico",
            "trend": "up" if variacao_ticket and variacao_ticket > 0 else "down" if variacao_ticket and variacao_ticket < 0 else "neutral",
        },
    ]

    return {
        "kpis": kpis,
        "top_produtos": top_produtos,
        "rupturas": rupturas,
    }


def generate_report_payload(tipo: str, loja_id: Optional[int] = None, parametros: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    parametros = parametros or {}
    tipo_normalizado = tipo.strip().lower()

    metrics = make_dashboard_metrics(loja_id=loja_id)

    if "vendas" in tipo_normalizado and "período" in tipo_normalizado:
        return {
            "resumo": metrics["kpis"],
            "observacao": "Dados consolidados para o período selecionado.",
        }

    if "ticket" in tipo_normalizado:
        ticket = next((item for item in metrics["kpis"] if item["id"] == "ticket_medio"), None)
        return {"ticket_medio": ticket, "periodo": parametros.get("periodo", "dia atual")}

    if "ranking" in tipo_normalizado or "produtos" in tipo_normalizado:
        return {"top_produtos": metrics["top_produtos"]}

    if "margem" in tipo_normalizado:
        return {"dados": metrics["top_produtos"], "observacao": "Margens aproximadas considerando o custo cadastrado."}

    if "ruptura" in tipo_normalizado:
        return {"rupturas": metrics["rupturas"]}

    if "dre" in tipo_normalizado:
        faturamento = next((item for item in metrics["kpis"] if item["id"] == "faturamento"), None)
        ticket = next((item for item in metrics["kpis"] if item["id"] == "ticket_medio"), None)
        return {
            "dre": {
                "receita": faturamento,
                "ticket_medio": ticket,
                "observacao": "Demonstrativo simplificado com base nas vendas do período.",
            }
        }

    return {"mensagem": "Relatório gerado com dados consolidados."}
