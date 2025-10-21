from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from core.models import Cliente, Produto, Venda, Lote, Alerta
from core.services.alert_service import AlertService


class AlertServiceTestCase(TestCase):
    def setUp(self):
        self.produto = Produto.objects.create(
            nome="Produto Teste",
            preco=Decimal("10.00"),
            estoque=Decimal("10.00"),
        )

    def test_verificar_limite_credito_cria_alerta(self):
        cliente = Cliente.objects.create(
            nome="Cliente Fiado",
            limite_credito=Decimal("100.00"),
        )
        Venda.objects.create(
            cliente=cliente,
            status="FINALIZADA",
            status_pagamento="PENDENTE",
            total=Decimal("95.00"),
            forma_pagamento="FIADO",
        )

        alertas = AlertService.verificar_limite_credito()

        self.assertEqual(len(alertas), 1)
        alerta = alertas[0]
        self.assertEqual(alerta.cliente, cliente)
        self.assertTrue(alerta.titulo.startswith("🔴"))

    def test_verificar_produtos_vencendo(self):
        Lote.objects.create(
            produto=self.produto,
            quantidade=Decimal("3.00"),
            data_validade=timezone.now().date() + timedelta(days=2),
        )

        alertas = AlertService.verificar_produtos_vencendo()

        self.assertEqual(len(alertas), 1)
        self.assertEqual(alertas[0].produto, self.produto)

    def test_verificar_produtos_vencidos(self):
        Lote.objects.create(
            produto=self.produto,
            quantidade=Decimal("2.00"),
            data_validade=timezone.now().date() - timedelta(days=1),
        )

        alertas = AlertService.verificar_produtos_vencidos()

        self.assertEqual(len(alertas), 1)
        self.assertEqual(alertas[0].produto, self.produto)
        self.assertEqual(Alerta.objects.count(), 1)
