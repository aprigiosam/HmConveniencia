from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from django.db.models import Count, F, Max, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

from apps.catalog.models import Produto
from apps.core.models import Cliente
from apps.sales.models import ItemVenda, PagamentoVenda, Venda

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


def _to_float(valor: Optional[Decimal]) -> float:
    if valor is None:
        return 0.0
    return float(valor)


def _parse_periodo(parametros: Optional[Dict[str, Any]]) -> Tuple[timezone.datetime.date, timezone.datetime.date]:
    hoje = timezone.localdate()
    default_fim = hoje
    default_inicio = hoje - timedelta(days=29)

    if not parametros:
        return default_inicio, default_fim

    data_inicio_raw = parametros.get("data_inicio")
    data_fim_raw = parametros.get("data_fim")

    def _parse(value: Any) -> Optional[timezone.datetime.date]:
        if not value:
            return None
        if isinstance(value, str):
            try:
                return datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError:
                return None
        if isinstance(value, datetime):
            return value.date()
        return value

    data_inicio = _parse(data_inicio_raw) or default_inicio
    data_fim = _parse(data_fim_raw) or default_fim

    if data_inicio > data_fim:
        data_inicio, data_fim = data_fim, data_inicio

    return data_inicio, data_fim


def make_sales_report(
    loja_id: Optional[int] = None,
    parametros: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    data_inicio, data_fim = _parse_periodo(parametros)

    filtro_loja = {"loja_id": loja_id} if loja_id else {}

    vendas_qs = Venda.objects.filter(
        status=Venda.Status.FINALIZADA,
        created_at__date__gte=data_inicio,
        created_at__date__lte=data_fim,
        **filtro_loja,
    )

    totais = vendas_qs.aggregate(
        faturamento_bruto=Coalesce(Sum("valor_subtotal"), Value(Decimal("0"))),
        descontos=Coalesce(Sum("valor_desconto"), Value(Decimal("0"))),
        faturamento_liquido=Coalesce(Sum("valor_total"), Value(Decimal("0"))),
        quantidade_vendas=Count("id"),
    )

    quantidade_vendas = int(totais["quantidade_vendas"]) if totais["quantidade_vendas"] else 0
    faturamento_liquido = totais["faturamento_liquido"] or Decimal("0")

    ticket_medio = Decimal("0")
    if quantidade_vendas:
        ticket_medio = faturamento_liquido / Decimal(quantidade_vendas)

    itens_qs = ItemVenda.objects.filter(venda__in=vendas_qs)
    total_itens = itens_qs.aggregate(total=Coalesce(Sum("quantidade"), Value(Decimal("0"))))["total"] or Decimal("0")

    clientes_unicos = (
        vendas_qs.exclude(cliente__isnull=True)
        .values("cliente_id")
        .distinct()
        .count()
    )

    resumo = {
        "faturamento_bruto": {
            "valor": _to_float(totais["faturamento_bruto"]),
            "display": _format_currency(totais["faturamento_bruto"]),
        },
        "descontos": {
            "valor": _to_float(totais["descontos"]),
            "display": _format_currency((totais["descontos"] or Decimal("0")) * -1),
        },
        "faturamento_liquido": {
            "valor": _to_float(faturamento_liquido),
            "display": _format_currency(faturamento_liquido),
        },
        "quantidade_vendas": {
            "valor": quantidade_vendas,
            "display": f"{quantidade_vendas} vendas",
        },
        "ticket_medio": {
            "valor": _to_float(ticket_medio),
            "display": _format_currency(ticket_medio),
        },
        "total_itens": {
            "valor": _to_float(total_itens),
            "display": f"{_to_float(total_itens):,.0f} itens".replace(",", "."),
        },
        "clientes_unicos": {
            "valor": clientes_unicos,
            "display": f"{clientes_unicos} clientes",
        },
    }

    pagamentos_qs = PagamentoVenda.objects.filter(venda__in=vendas_qs)
    pagamentos = []
    for item in (
        pagamentos_qs.values("forma_pagamento__id", "forma_pagamento__nome")
        .annotate(total=Coalesce(Sum("valor"), Value(Decimal("0"))))
        .order_by("-total")
    ):
        valor_total = item["total"] or Decimal("0")
        participacao = Decimal("0")
        if faturamento_liquido:
            participacao = (valor_total / faturamento_liquido) * 100
        pagamentos.append(
            {
                "id": item["forma_pagamento__id"],
                "nome": item["forma_pagamento__nome"],
                "valor": _to_float(valor_total),
                "valor_display": _format_currency(valor_total),
                "participacao": float(round(participacao, 2)),
                "participacao_display": f"{float(round(participacao, 1)):.1f}%",
            }
        )

    por_dia = []
    for item in (
        vendas_qs.annotate(data=TruncDate("created_at"))
        .values("data")
        .annotate(
            faturamento=Coalesce(Sum("valor_total"), Value(Decimal("0"))),
            vendas=Count("id"),
            itens=Coalesce(Sum("itens__quantidade"), Value(Decimal("0"))),
        )
        .order_by("data")
    ):
        data = item["data"]
        por_dia.append(
            {
                "data": data.isoformat() if data else None,
                "faturamento": _to_float(item["faturamento"]),
                "faturamento_display": _format_currency(item["faturamento"]),
                "vendas": item["vendas"],
                "itens": _to_float(item["itens"]),
            }
        )

    top_produtos: List[Dict[str, Any]] = []
    for item in (
        itens_qs.values(
            "produto__id",
            "produto__sku",
            "produto__nome",
            "produto__categoria__nome",
        )
        .annotate(
            quantidade_total=Coalesce(Sum("quantidade"), Value(Decimal("0"))),
            faturamento_total=Coalesce(Sum("valor_total"), Value(Decimal("0"))),
            custo_total=Coalesce(Sum(F("quantidade") * F("produto__preco_custo")), Value(Decimal("0"))),
        )
        .order_by("-faturamento_total")[:10]
    ):
        quantidade = item["quantidade_total"] or Decimal("0")
        faturamento = item["faturamento_total"] or Decimal("0")
        custo_total = item["custo_total"] or Decimal("0")
        margem_percentual = Decimal("0")
        if faturamento > 0:
            margem_percentual = ((faturamento - custo_total) / faturamento) * 100
        margem_float = float(round(margem_percentual, 2)) if margem_percentual else 0.0
        top_produtos.append(
            {
                "produto_id": item["produto__id"],
                "sku": item["produto__sku"],
                "nome": item["produto__nome"],
                "categoria": item["produto__categoria__nome"],
                "quantidade": _to_float(quantidade),
                "quantidade_display": f"{_to_float(quantidade):,.0f} un".replace(",", "."),
                "faturamento": _to_float(faturamento),
                "faturamento_display": _format_currency(faturamento),
                "margem_percentual": margem_float,
                "margem_display": f"{margem_float:.1f}%",
            }
        )

    top_clientes: List[Dict[str, Any]] = []
    for item in (
        vendas_qs.exclude(cliente__isnull=True)
        .values("cliente__id", "cliente__nome")
        .annotate(
            valor_total=Coalesce(Sum("valor_total"), Value(Decimal("0"))),
            compras=Count("id"),
            ultima_compra=Max("created_at"),
        )
        .order_by("-valor_total")[:10]
    ):
        valor_total = item["valor_total"] or Decimal("0")
        compras = item["compras"] or 0
        ticket_cliente = Decimal("0")
        if compras:
            ticket_cliente = valor_total / Decimal(compras)
        ultima_compra = item["ultima_compra"]
        top_clientes.append(
            {
                "cliente_id": item["cliente__id"],
                "nome": item["cliente__nome"],
                "compras": compras,
                "valor": _to_float(valor_total),
                "valor_display": _format_currency(valor_total),
                "ticket_medio": _to_float(ticket_cliente),
                "ticket_medio_display": _format_currency(ticket_cliente),
                "ultima_compra": ultima_compra.isoformat() if ultima_compra else None,
            }
        )

    return {
        "periodo": {
            "inicio": data_inicio.isoformat(),
            "fim": data_fim.isoformat(),
            "dias": (data_fim - data_inicio).days + 1,
        },
        "resumo": resumo,
        "formas_pagamento": pagamentos,
        "por_dia": por_dia,
        "top_produtos": top_produtos,
        "top_clientes": top_clientes,
    }


def make_dashboard_metrics(
    loja_id: Optional[int] = None,
    parametros: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    data_inicio, data_fim = _parse_periodo(parametros)
    periodo_params = {
        "data_inicio": data_inicio.isoformat(),
        "data_fim": data_fim.isoformat(),
    }

    filtro_loja = {"loja_id": loja_id} if loja_id else {}

    vendas_periodo_qs = Venda.objects.filter(
        status=Venda.Status.FINALIZADA,
        created_at__date__gte=data_inicio,
        created_at__date__lte=data_fim,
        **filtro_loja,
    )

    dias_periodo = (data_fim - data_inicio).days + 1
    periodo_anterior_inicio = data_inicio - timedelta(days=dias_periodo)
    periodo_anterior_fim = data_inicio - timedelta(days=1)

    vendas_periodo_anterior_qs = Venda.objects.filter(
        status=Venda.Status.FINALIZADA,
        created_at__date__gte=periodo_anterior_inicio,
        created_at__date__lte=periodo_anterior_fim,
        **filtro_loja,
    )

    totais_atual = vendas_periodo_qs.aggregate(
        faturamento=Coalesce(Sum("valor_total"), Value(Decimal("0"))),
        quantidade=Count("id"),
    )
    totais_anterior = vendas_periodo_anterior_qs.aggregate(
        faturamento=Coalesce(Sum("valor_total"), Value(Decimal("0"))),
        quantidade=Count("id"),
    )

    faturamento_atual = totais_atual["faturamento"] or Decimal("0")
    faturamento_anterior = totais_anterior["faturamento"] or Decimal("0")

    quantidade_atual = totais_atual["quantidade"] or 0
    quantidade_anterior = totais_anterior["quantidade"] or 0

    ticket_atual = Decimal("0")
    if quantidade_atual:
        ticket_atual = faturamento_atual / Decimal(quantidade_atual)

    ticket_anterior = Decimal("0")
    if quantidade_anterior:
        ticket_anterior = faturamento_anterior / Decimal(quantidade_anterior)

    clientes_atual = (
        vendas_periodo_qs.exclude(cliente__isnull=True)
        .values("cliente_id")
        .distinct()
        .count()
    )
    clientes_anterior = (
        vendas_periodo_anterior_qs.exclude(cliente__isnull=True)
        .values("cliente_id")
        .distinct()
        .count()
    )

    variacao_faturamento = _calculate_variation(faturamento_atual, faturamento_anterior)
    variacao_vendas = _calculate_variation(Decimal(quantidade_atual), Decimal(quantidade_anterior))
    variacao_ticket = _calculate_variation(ticket_atual, ticket_anterior)
    variacao_clientes = _calculate_variation(Decimal(clientes_atual), Decimal(clientes_anterior))

    produtos_qs = Produto.objects.filter(ativo=True)
    if loja_id:
        produtos_qs = produtos_qs.filter(lotes__loja_id=loja_id)

    produtos_qs = produtos_qs.annotate(
        estoque_total=Coalesce(Sum("lotes__quantidade", filter=Q(lotes__loja_id=loja_id) if loja_id else Q()), Value(0)),
    )

    rupturas: List[Dict[str, Any]] = []
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

    sales_report = make_sales_report(loja_id=loja_id, parametros=periodo_params)
    top_produtos = sales_report.get("top_produtos", [])[:5]
    top_clientes = sales_report.get("top_clientes", [])[:6]
    sales_summary = sales_report.get("resumo", {})
    sales_trend = sales_report.get("por_dia", [])
    payments = sales_report.get("formas_pagamento", [])
    periodo_info = sales_report.get("periodo", {
        "inicio": data_inicio.isoformat(),
        "fim": data_fim.isoformat(),
        "dias": dias_periodo,
    })

    kpis = [
        {
            "id": "faturamento",
            "title": "Faturamento",
            "value": float(faturamento_atual),
            "value_display": _format_currency(faturamento_atual),
            "change_display": (
                f"{_format_percent(variacao_faturamento)} vs período anterior"
                if variacao_faturamento is not None
                else "Sem histórico"
            ),
            "trend": "up" if variacao_faturamento and variacao_faturamento > 0 else "down" if variacao_faturamento and variacao_faturamento < 0 else "neutral",
        },
        {
            "id": "vendas",
            "title": "Cupons",
            "value": quantidade_atual,
            "value_display": f"{quantidade_atual} vendas",
            "change_display": (
                f"{_format_percent(variacao_vendas)} vs período anterior"
                if variacao_vendas is not None
                else "Sem histórico"
            ),
            "trend": "up" if variacao_vendas and variacao_vendas > 0 else "down" if variacao_vendas and variacao_vendas < 0 else "neutral",
        },
        {
            "id": "clientes_fidelidade",
            "title": "Clientes únicos",
            "value": clientes_atual,
            "value_display": f"{clientes_atual} clientes",
            "change_display": (
                f"{_format_percent(variacao_clientes)} vs período anterior"
                if variacao_clientes is not None
                else "Sem histórico"
            ),
            "trend": "up" if variacao_clientes and variacao_clientes > 0 else "down" if variacao_clientes and variacao_clientes < 0 else "neutral",
        },
        {
            "id": "ticket_medio",
            "title": "Ticket médio",
            "value": float(ticket_atual),
            "value_display": _format_currency(ticket_atual),
            "change_display": (
                f"{_format_percent(variacao_ticket)} vs período anterior"
                if variacao_ticket is not None
                else "Sem histórico"
            ),
            "trend": "up" if variacao_ticket and variacao_ticket > 0 else "down" if variacao_ticket and variacao_ticket < 0 else "neutral",
        },
        {
            "id": "rupturas",
            "title": "Estoque crítico",
            "value": len(rupturas),
            "value_display": f"{len(rupturas)} itens",
            "change_display": "Objetivo: 0 produtos em ruptura",
            "trend": "down" if rupturas else "up",
        },
    ]

    return {
        "periodo": periodo_info,
        "kpis": kpis,
        "sales_summary": sales_summary,
        "sales_trend": sales_trend,
        "payments": payments,
        "top_produtos": top_produtos,
        "top_clientes": top_clientes,
        "rupturas": rupturas,
    }


def generate_report_payload(tipo: str, loja_id: Optional[int] = None, parametros: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    parametros = parametros or {}
    tipo_normalizado = tipo.strip().lower()

    if "vendas" in tipo_normalizado and "completo" in tipo_normalizado:
        return make_sales_report(loja_id=loja_id, parametros=parametros)

    metrics = make_dashboard_metrics(loja_id=loja_id, parametros=parametros)

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
