"""
Testes para fechamento de caixa detalhado por forma de pagamento
"""

from decimal import Decimal
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from core.models import Caixa, Venda, Produto, Cliente


class CaixaDetalhadoTestCase(APITestCase):
    """Testes para fechamento detalhado de caixa"""

    def setUp(self):
        """Configuração inicial para cada teste"""
        self.user = User.objects.create_user(
            username="testuser", password="testpass123"
        )
        self.client.login(username="testuser", password="testpass123")

        # Cria produtos para vendas
        self.produto1 = Produto.objects.create(
            nome="Produto 1", preco=Decimal("10.00"), estoque=Decimal("100")
        )
        self.produto2 = Produto.objects.create(
            nome="Produto 2", preco=Decimal("20.00"), estoque=Decimal("100")
        )

        # Cria cliente para vendas fiado
        self.cliente = Cliente.objects.create(
            nome="Cliente Teste", limite_credito=Decimal("1000.00")
        )

    def test_preview_caixa_sem_vendas(self):
        """
        Testa preview de caixa sem vendas
        """
        # Abre caixa
        caixa = Caixa.objects.create(valor_inicial=Decimal("100.00"), status="ABERTO")

        # Busca preview
        url = f"/api/caixa/{caixa.id}/preview/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["total_dinheiro"]), Decimal("0.00"))
        self.assertEqual(Decimal(response.data["total_debito"]), Decimal("0.00"))
        self.assertEqual(Decimal(response.data["total_credito"]), Decimal("0.00"))
        self.assertEqual(Decimal(response.data["total_pix"]), Decimal("0.00"))
        self.assertEqual(Decimal(response.data["total_fiado"]), Decimal("0.00"))
        self.assertEqual(Decimal(response.data["total_vendas"]), Decimal("0.00"))
        self.assertEqual(
            Decimal(response.data["valor_esperado_caixa"]), Decimal("100.00")
        )

    def test_preview_caixa_com_vendas_multiplas_formas(self):
        """
        Testa preview com vendas em múltiplas formas de pagamento
        """
        # Abre caixa
        caixa = Caixa.objects.create(valor_inicial=Decimal("100.00"), status="ABERTO")

        # Cria vendas com formas diferentes
        Venda.objects.create(
            forma_pagamento="DINHEIRO", status="FINALIZADA", total=Decimal("50.00")
        )
        Venda.objects.create(
            forma_pagamento="DEBITO", status="FINALIZADA", total=Decimal("30.00")
        )
        Venda.objects.create(
            forma_pagamento="CREDITO", status="FINALIZADA", total=Decimal("40.00")
        )
        Venda.objects.create(
            forma_pagamento="PIX", status="FINALIZADA", total=Decimal("25.00")
        )
        Venda.objects.create(
            forma_pagamento="FIADO",
            status="FINALIZADA",
            total=Decimal("15.00"),
            cliente=self.cliente,
        )

        # Busca preview
        url = f"/api/caixa/{caixa.id}/preview/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["total_dinheiro"]), Decimal("50.00"))
        self.assertEqual(Decimal(response.data["total_debito"]), Decimal("30.00"))
        self.assertEqual(Decimal(response.data["total_credito"]), Decimal("40.00"))
        self.assertEqual(Decimal(response.data["total_pix"]), Decimal("25.00"))
        self.assertEqual(Decimal(response.data["total_fiado"]), Decimal("15.00"))
        self.assertEqual(Decimal(response.data["total_vendas"]), Decimal("160.00"))
        # Valor esperado = inicial (100) + dinheiro (50) = 150
        self.assertEqual(
            Decimal(response.data["valor_esperado_caixa"]), Decimal("150.00")
        )

    def test_preview_caixa_com_movimentacoes(self):
        """
        Testa preview com sangrias e suprimentos
        """
        from core.models import MovimentacaoCaixa

        # Abre caixa
        caixa = Caixa.objects.create(valor_inicial=Decimal("100.00"), status="ABERTO")

        # Cria venda em dinheiro
        Venda.objects.create(
            forma_pagamento="DINHEIRO", status="FINALIZADA", total=Decimal("50.00")
        )

        # Cria movimentações
        MovimentacaoCaixa.objects.create(
            caixa=caixa, tipo="SANGRIA", valor=Decimal("20.00"), descricao="Sangria teste"
        )
        MovimentacaoCaixa.objects.create(
            caixa=caixa, tipo="SUPRIMENTO", valor=Decimal("30.00"), descricao="Suprimento teste"
        )

        # Busca preview
        url = f"/api/caixa/{caixa.id}/preview/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["total_sangrias"]), Decimal("20.00"))
        self.assertEqual(Decimal(response.data["total_suprimentos"]), Decimal("30.00"))
        # Valor esperado = inicial (100) + dinheiro (50) + suprimentos (30) - sangrias (20) = 160
        self.assertEqual(
            Decimal(response.data["valor_esperado_caixa"]), Decimal("160.00")
        )

    def test_fechamento_salva_detalhamento(self):
        """
        Testa que o fechamento salva corretamente o detalhamento
        """
        # Abre caixa
        caixa = Caixa.objects.create(valor_inicial=Decimal("100.00"), status="ABERTO")

        # Cria vendas com formas diferentes
        Venda.objects.create(
            forma_pagamento="DINHEIRO", status="FINALIZADA", total=Decimal("50.00")
        )
        Venda.objects.create(
            forma_pagamento="DEBITO", status="FINALIZADA", total=Decimal("30.00")
        )
        Venda.objects.create(
            forma_pagamento="PIX", status="FINALIZADA", total=Decimal("20.00")
        )

        # Fecha caixa
        url = f"/api/caixa/{caixa.id}/fechar/"
        data = {"valor_final_informado": "150.00"}
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verifica se salvou os detalhes
        caixa.refresh_from_db()
        self.assertEqual(caixa.total_dinheiro, Decimal("50.00"))
        self.assertEqual(caixa.total_debito, Decimal("30.00"))
        self.assertEqual(caixa.total_credito, Decimal("0.00"))
        self.assertEqual(caixa.total_pix, Decimal("20.00"))
        self.assertEqual(caixa.total_fiado, Decimal("0.00"))
        self.assertEqual(caixa.total_vendas, Decimal("100.00"))
        self.assertEqual(caixa.status, "FECHADO")

    def test_fechamento_calcula_corretamente_valor_esperado(self):
        """
        Testa que o cálculo do valor esperado considera apenas dinheiro
        """
        # Abre caixa
        caixa = Caixa.objects.create(valor_inicial=Decimal("50.00"), status="ABERTO")

        # Cria vendas
        Venda.objects.create(
            forma_pagamento="DINHEIRO", status="FINALIZADA", total=Decimal("100.00")
        )
        Venda.objects.create(
            forma_pagamento="DEBITO", status="FINALIZADA", total=Decimal("200.00")
        )
        Venda.objects.create(
            forma_pagamento="PIX", status="FINALIZADA", total=Decimal("150.00")
        )

        # Fecha caixa
        url = f"/api/caixa/{caixa.id}/fechar/"
        data = {"valor_final_informado": "150.00"}
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verifica cálculos
        caixa.refresh_from_db()
        # Total de vendas = 100 + 200 + 150 = 450
        self.assertEqual(caixa.total_vendas, Decimal("450.00"))
        # Valor esperado em caixa = inicial (50) + dinheiro (100) = 150
        self.assertEqual(caixa.valor_final_sistema, Decimal("150.00"))
        # Diferença = informado (150) - esperado (150) = 0
        self.assertEqual(caixa.diferenca, Decimal("0.00"))

    def test_preview_nao_conta_vendas_canceladas(self):
        """
        Testa que preview não conta vendas canceladas
        """
        # Abre caixa
        caixa = Caixa.objects.create(valor_inicial=Decimal("100.00"), status="ABERTO")

        # Cria vendas finalizadas e canceladas
        Venda.objects.create(
            forma_pagamento="DINHEIRO", status="FINALIZADA", total=Decimal("50.00")
        )
        Venda.objects.create(
            forma_pagamento="DINHEIRO", status="CANCELADA", total=Decimal("30.00")
        )

        # Busca preview
        url = f"/api/caixa/{caixa.id}/preview/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Deve contar apenas a finalizada
        self.assertEqual(Decimal(response.data["total_dinheiro"]), Decimal("50.00"))
        self.assertEqual(Decimal(response.data["total_vendas"]), Decimal("50.00"))

    def test_preview_apenas_vendas_apos_abertura(self):
        """
        Testa que preview conta apenas vendas após abertura do caixa
        """
        # Cria venda ANTES de abrir caixa
        venda_antiga = Venda.objects.create(
            forma_pagamento="DINHEIRO", status="FINALIZADA", total=Decimal("100.00")
        )
        # Força data antiga
        Venda.objects.filter(id=venda_antiga.id).update(
            created_at=timezone.now() - timezone.timedelta(days=1)
        )

        # Abre caixa
        caixa = Caixa.objects.create(valor_inicial=Decimal("50.00"), status="ABERTO")

        # Cria venda DEPOIS de abrir
        Venda.objects.create(
            forma_pagamento="DINHEIRO", status="FINALIZADA", total=Decimal("30.00")
        )

        # Busca preview
        url = f"/api/caixa/{caixa.id}/preview/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Deve contar apenas a venda de R$ 30 (após abertura)
        self.assertEqual(Decimal(response.data["total_dinheiro"]), Decimal("30.00"))

    def test_preview_caixa_fechado_retorna_erro(self):
        """
        Testa que não pode buscar preview de caixa já fechado
        """
        # Cria caixa já fechado
        caixa = Caixa.objects.create(
            valor_inicial=Decimal("100.00"),
            status="FECHADO",
            valor_final_sistema=Decimal("100.00"),
            valor_final_informado=Decimal("100.00"),
            diferenca=Decimal("0.00"),
        )

        # Tenta buscar preview
        url = f"/api/caixa/{caixa.id}/preview/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)
