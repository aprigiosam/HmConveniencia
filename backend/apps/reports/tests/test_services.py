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
from apps.core.models import Cliente, Loja
from apps.sales.models import ItemVenda, Venda

from unittest.mock import patch

from apps.reports.services import (
    _calculate_variation,
    _format_currency,
    _format_percent,
    generate_report_payload,
    make_dashboard_metrics,
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
        mock_metrics.assert_called_once_with(loja_id=1)

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

    @patch("apps.reports.services.make_dashboard_metrics")
    def test_generate_report_payload_padrao(self, mock_metrics):
        mock_metrics.return_value = {"kpis": [], "top_produtos": [], "rupturas": []}

        payload = generate_report_payload("Custom", loja_id=None)

        self.assertEqual(payload["mensagem"], "Relatório gerado com dados consolidados.")
