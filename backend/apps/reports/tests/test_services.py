from datetime import timedelta
from decimal import Decimal
import warnings

from django.test import TestCase
from django.utils import timezone

warnings.filterwarnings(
    "ignore",
    message="DateTimeField Cliente.created_at received a naive datetime*",
    category=RuntimeWarning,
)

from apps.catalog.models import Categoria, Fornecedor, Produto, LoteProduto
from apps.core.models import Cliente, FormaPagamento, Loja
from apps.sales.models import ItemVenda, PagamentoVenda, Venda

from unittest.mock import patch

from apps.reports.services import (
    _calculate_variation,
    _format_currency,
    _format_percent,
    generate_report_payload,
    make_dashboard_metrics,
    make_sales_report,
)


class DashboardMetricsTests(TestCase):
    def setUp(self):
        self.loja = Loja.objects.create(
            cnpj="99.888.777/0001-55",
            nome="Loja Bairro",
        )
        self.cliente = Cliente.objects.create(
            cpf="123.456.789-00",
            nome="Maria",
            created_at=timezone.now(),
        )
        categoria = Categoria.objects.create(nome="Mercearia")
        fornecedor = Fornecedor.objects.create(
            cnpj_cpf="22.333.444/0001-55",
            nome="Fornecedor Local",
        )
        self.produto = Produto.objects.create(
            sku="ARROZ01",
            codigo_barras="7894561230001",
            nome="Arroz Tipo 1",
            categoria=categoria,
            fornecedor=fornecedor,
            preco_custo=Decimal("10.00"),
            preco_venda=Decimal("15.00"),
            estoque_minimo=20,
        )
        LoteProduto.objects.create(
            produto=self.produto,
            loja=self.loja,
            numero_lote="L001",
            quantidade=10,
            custo_unitario=Decimal("10.00"),
        )
        self.venda = Venda.objects.create(
            loja=self.loja,
            cliente=self.cliente,
            numero_venda="VENDA-001",
            status=Venda.Status.FINALIZADA,
            created_at=timezone.now(),
        )
        ItemVenda.objects.create(
            venda=self.venda,
            produto=self.produto,
            quantidade=Decimal("2"),
            preco_unitario=Decimal("15.00"),
            valor_total=Decimal("30.00"),
        )
        self.venda.calcular_total()

    def test_metrics_resumo(self):
        metrics = make_dashboard_metrics(loja_id=self.loja.id)
        ids = {item["id"]: item for item in metrics["kpis"]}
        faturamento = ids["faturamento"]
        self.assertEqual(faturamento["value"], 30.0)
        self.assertEqual(metrics["sales_summary"]["faturamento_liquido"]["valor"], 30.0)
        self.assertEqual(metrics["sales_summary"]["quantidade_vendas"]["valor"], 1)
        self.assertGreaterEqual(len(metrics["sales_trend"]), 1)
        self.assertEqual(metrics["top_produtos"][0]["sku"], "ARROZ01")
        self.assertEqual(len(metrics["rupturas"]), 1)
        ruptura = metrics["rupturas"][0]
        self.assertEqual(ruptura["sku"], "ARROZ01")


class ReportHelpersTests(TestCase):
    def test_format_currency_usando_padroes_ptbr(self):
        resultado = _format_currency(Decimal("1234.5"))
        self.assertEqual(resultado, "R$ 1.234,50")

    def test_format_percent_trata_none(self):
        self.assertEqual(_format_percent(None), "-")
        self.assertEqual(_format_percent(Decimal("10")), "+10%")

    def test_calculate_variation_previne_divisao_por_zero(self):
        self.assertIsNone(_calculate_variation(Decimal("10"), Decimal("0")))
        self.assertEqual(
            _calculate_variation(Decimal("200"), Decimal("100")),
            Decimal("100"),
        )

    @patch("apps.reports.services.make_dashboard_metrics")
    def test_generate_report_payload_para_periodo(self, mock_metrics):
        mock_metrics.return_value = {"kpis": ["kpi"], "top_produtos": [], "rupturas": []}

        payload = generate_report_payload("Relatório de vendas por período", loja_id=1)

        self.assertEqual(payload["resumo"], ["kpi"])
        mock_metrics.assert_called_once_with(loja_id=1, parametros={})

    @patch("apps.reports.services.make_dashboard_metrics")
    def test_generate_report_payload_ticket(self, mock_metrics):
        mock_metrics.return_value = {
            "kpis": [{"id": "ticket_medio", "value": 50}],
            "top_produtos": [],
            "rupturas": [],
        }

        payload = generate_report_payload("Ticket médio", parametros={"periodo": "hoje"})

        self.assertEqual(payload["ticket_medio"], {"id": "ticket_medio", "value": 50})
        self.assertEqual(payload["periodo"], "hoje")
        mock_metrics.assert_called_once_with(loja_id=None, parametros={"periodo": "hoje"})

    @patch("apps.reports.services.make_dashboard_metrics")
    def test_generate_report_payload_padrao(self, mock_metrics):
        mock_metrics.return_value = {"kpis": [], "top_produtos": [], "rupturas": []}

        payload = generate_report_payload("Custom", loja_id=None)

        self.assertEqual(payload["mensagem"], "Relatório gerado com dados consolidados.")
        mock_metrics.assert_called_once_with(loja_id=None, parametros={})


class SalesReportCompleteTests(TestCase):
    def setUp(self):
        self.loja = Loja.objects.create(
            cnpj="11.222.333/0001-44",
            nome="Loja Centro",
        )
        self.cliente1 = Cliente.objects.create(cpf="111.222.333-44", nome="João")
        self.cliente2 = Cliente.objects.create(cpf="555.666.777-88", nome="Ana")

        categoria = Categoria.objects.create(nome="Bebidas")
        fornecedor = Fornecedor.objects.create(cnpj_cpf="11.222.333/0001-99", nome="Fornecedor A")
        self.produto1 = Produto.objects.create(
            sku="REFRI01",
            codigo_barras="7891234560001",
            nome="Refrigerante 2L",
            categoria=categoria,
            fornecedor=fornecedor,
            preco_custo=Decimal("5.00"),
            preco_venda=Decimal("25.00"),
        )
        self.produto2 = Produto.objects.create(
            sku="AGUA01",
            codigo_barras="7891234560002",
            nome="Água 1L",
            categoria=categoria,
            fornecedor=fornecedor,
            preco_custo=Decimal("1.50"),
            preco_venda=Decimal("4.00"),
        )

        self.dinheiro = FormaPagamento.objects.create(nome="Dinheiro", tipo=FormaPagamento.Tipo.DINHEIRO)
        self.pix = FormaPagamento.objects.create(nome="Pix", tipo=FormaPagamento.Tipo.PIX)

        hoje = timezone.now()
        dia_passado = hoje - timedelta(days=7)

        self.venda1 = Venda.objects.create(
            loja=self.loja,
            cliente=self.cliente1,
            numero_venda="V-1001",
            status=Venda.Status.FINALIZADA,
            valor_desconto=Decimal("0.00"),
        )
        ItemVenda.objects.create(
            venda=self.venda1,
            produto=self.produto1,
            quantidade=Decimal("2"),
            preco_unitario=Decimal("25.00"),
            valor_total=Decimal("50.00"),
        )
        self.venda1.calcular_total()
        Venda.objects.filter(pk=self.venda1.pk).update(created_at=dia_passado)
        PagamentoVenda.objects.create(venda=self.venda1, forma_pagamento=self.dinheiro, valor=Decimal("20.00"))
        PagamentoVenda.objects.create(venda=self.venda1, forma_pagamento=self.pix, valor=Decimal("30.00"))

        self.venda2 = Venda.objects.create(
            loja=self.loja,
            cliente=self.cliente2,
            numero_venda="V-1002",
            status=Venda.Status.FINALIZADA,
        )
        ItemVenda.objects.create(
            venda=self.venda2,
            produto=self.produto2,
            quantidade=Decimal("3"),
            preco_unitario=Decimal("15.00"),
            valor_total=Decimal("45.00"),
        )
        self.venda2.calcular_total()
        Venda.objects.filter(pk=self.venda2.pk).update(created_at=hoje)
        PagamentoVenda.objects.create(venda=self.venda2, forma_pagamento=self.pix, valor=Decimal("45.00"))

        venda_cancelada = Venda.objects.create(
            loja=self.loja,
            cliente=self.cliente1,
            numero_venda="V-1003",
            status=Venda.Status.CANCELADA,
        )
        ItemVenda.objects.create(
            venda=venda_cancelada,
            produto=self.produto1,
            quantidade=Decimal("1"),
            preco_unitario=Decimal("10.00"),
            valor_total=Decimal("10.00"),
        )
        venda_cancelada.calcular_total()

        self.periodo_inicio = (hoje - timedelta(days=10)).date()
        self.periodo_fim = hoje.date()

    def test_make_sales_report_returns_detailed_payload(self):
        payload = make_sales_report(
            loja_id=self.loja.id,
            parametros={
                "data_inicio": self.periodo_inicio.isoformat(),
                "data_fim": self.periodo_fim.isoformat(),
            },
        )

        self.assertEqual(payload["periodo"]["inicio"], self.periodo_inicio.isoformat())
        self.assertEqual(payload["periodo"]["fim"], self.periodo_fim.isoformat())
        resumo = payload["resumo"]
        self.assertEqual(resumo["faturamento_liquido"]["valor"], 95.0)
        self.assertEqual(resumo["quantidade_vendas"]["valor"], 2)
        self.assertAlmostEqual(resumo["ticket_medio"]["valor"], 47.5)
        self.assertEqual(resumo["total_itens"]["valor"], 5.0)
        self.assertEqual(resumo["clientes_unicos"]["valor"], 2)

        formas_pagamento = {item["nome"]: item for item in payload["formas_pagamento"]}
        self.assertEqual(formas_pagamento["Dinheiro"]["valor"], 20.0)
        self.assertEqual(formas_pagamento["Pix"]["valor"], 75.0)

        datas = [item["data"] for item in payload["por_dia"]]
        self.assertEqual(len(datas), 2)
        self.assertIn(self.periodo_fim.isoformat(), datas)

        self.assertEqual(payload["top_produtos"][0]["sku"], "REFRI01")
        self.assertEqual(payload["top_clientes"][0]["nome"], "João")

    def test_make_sales_report_accepts_inverted_dates(self):
        payload = make_sales_report(
            loja_id=self.loja.id,
            parametros={
                "data_inicio": self.periodo_fim.isoformat(),
                "data_fim": self.periodo_inicio.isoformat(),
            },
        )

        self.assertEqual(payload["periodo"]["inicio"], self.periodo_inicio.isoformat())
        self.assertEqual(payload["periodo"]["fim"], self.periodo_fim.isoformat())
