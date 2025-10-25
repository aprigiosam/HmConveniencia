"""
Testes para Models - Valida lógica de negócio
"""

from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from core.models import Cliente, Produto, Venda, Categoria


class ClienteModelTestCase(TestCase):
    """Testes para o model Cliente"""

    def setUp(self):
        self.cliente = Cliente.objects.create(
            nome="João Silva",
            telefone="11999999999",
            cpf="12345678901",
            limite_credito=Decimal("1000.00"),
        )

    def test_str_representation(self):
        """Testa representação string do cliente"""
        self.assertEqual(str(self.cliente), "João Silva")

    def test_saldo_devedor_sem_dividas(self):
        """Testa saldo devedor quando não há dívidas"""
        self.assertEqual(self.cliente.saldo_devedor(), Decimal("0"))

    def test_saldo_devedor_com_dividas(self):
        """Testa cálculo de saldo devedor"""
        # Cria vendas pendentes (usando create sem numero único)
        v1 = Venda(
            cliente=self.cliente,
            status="FINALIZADA",
            status_pagamento="PENDENTE",
            total=Decimal("250.00"),
            forma_pagamento="FIADO",
            numero="TEST001",
        )
        v1.save()

        v2 = Venda(
            cliente=self.cliente,
            status="FINALIZADA",
            status_pagamento="PENDENTE",
            total=Decimal("150.00"),
            forma_pagamento="FIADO",
            numero="TEST002",
        )
        v2.save()

        self.assertEqual(self.cliente.saldo_devedor(), Decimal("400.00"))

    def test_pode_comprar_fiado_dentro_do_limite(self):
        """Testa compra fiado dentro do limite"""
        self.assertTrue(self.cliente.pode_comprar_fiado(Decimal("500.00")))

    def test_nao_pode_comprar_fiado_acima_do_limite(self):
        """Testa compra fiado acima do limite"""
        # Cria dívida de 800
        Venda.objects.create(
            cliente=self.cliente,
            status="FINALIZADA",
            status_pagamento="PENDENTE",
            total=Decimal("800.00"),
            forma_pagamento="FIADO",
        )

        # Tenta comprar mais 300 (total seria 1100, limite é 1000)
        self.assertFalse(self.cliente.pode_comprar_fiado(Decimal("300.00")))


class ProdutoModelTestCase(TestCase):
    """Testes para o model Produto"""

    def setUp(self):
        self.categoria = Categoria.objects.create(nome="Bebidas")
        self.produto = Produto.objects.create(
            nome="Coca-Cola",
            preco=Decimal("8.00"),
            preco_custo=Decimal("5.00"),
            estoque=Decimal("50"),
            codigo_barras="7894900011517",
            categoria=self.categoria,
        )

    def test_str_representation(self):
        """Testa representação string do produto"""
        self.assertEqual(str(self.produto), "Coca-Cola")

    def test_margem_lucro(self):
        """Testa cálculo de margem de lucro"""
        # (8 - 5) / 5 * 100 = 60%
        self.assertEqual(self.produto.margem_lucro, Decimal("60.0"))

    def test_margem_lucro_sem_preco_custo(self):
        """Testa margem de lucro quando não há preço de custo"""
        produto_sem_custo = Produto.objects.create(
            nome="Teste",
            preco=Decimal("10.00"),
            preco_custo=Decimal("0"),
            estoque=Decimal("10"),
        )
        self.assertEqual(produto_sem_custo.margem_lucro, Decimal("0"))

    def test_tem_estoque_suficiente(self):
        """Testa verificação de estoque suficiente"""
        self.assertTrue(self.produto.tem_estoque(Decimal("30")))

    def test_nao_tem_estoque_suficiente(self):
        """Testa verificação de estoque insuficiente"""
        self.assertFalse(self.produto.tem_estoque(Decimal("60")))

    def test_esta_vencido(self):
        """Testa produto vencido"""
        ontem = timezone.localdate() - timezone.timedelta(days=1)
        self.produto.data_validade = ontem
        self.produto.save()

        self.assertTrue(self.produto.esta_vencido)

    def test_nao_esta_vencido(self):
        """Testa produto não vencido"""
        amanha = timezone.localdate() + timezone.timedelta(days=1)
        self.produto.data_validade = amanha
        self.produto.save()

        self.assertFalse(self.produto.esta_vencido)

    def test_dias_para_vencer(self):
        """Testa cálculo de dias para vencer"""
        daqui_5_dias = timezone.localdate() + timezone.timedelta(days=5)
        self.produto.data_validade = daqui_5_dias
        self.produto.save()

        self.assertEqual(self.produto.dias_para_vencer, 5)

    def test_proximo_vencimento(self):
        """Testa produto próximo ao vencimento (até 7 dias)"""
        daqui_5_dias = timezone.localdate() + timezone.timedelta(days=5)
        self.produto.data_validade = daqui_5_dias
        self.produto.save()

        self.assertTrue(self.produto.proximo_vencimento)

    def test_nao_proximo_vencimento(self):
        """Testa produto não próximo ao vencimento"""
        daqui_15_dias = timezone.localdate() + timezone.timedelta(days=15)
        self.produto.data_validade = daqui_15_dias
        self.produto.save()

        self.assertFalse(self.produto.proximo_vencimento)


class VendaModelTestCase(TestCase):
    """Testes para o model Venda"""

    def setUp(self):
        self.cliente = Cliente.objects.create(
            nome="João Silva", limite_credito=Decimal("1000.00")
        )
        self.produto = Produto.objects.create(
            nome="Coca-Cola", preco=Decimal("8.00"), estoque=Decimal("50")
        )

    def test_str_representation(self):
        """Testa representação string da venda"""
        venda = Venda.objects.create(forma_pagamento="DINHEIRO", total=Decimal("50.00"))
        # Deve ter um número como V001, V002, etc
        self.assertTrue(str(venda).startswith("V"))

    def test_calcular_total(self):
        """Testa que o método calcular_total existe"""
        venda = Venda(forma_pagamento="DINHEIRO", numero="TEST_CALC")
        venda.save()

        # Método calcula total baseado nos itens
        # Como não tem itens, retorna None ou 0
        venda.calcular_total()
        # Apenas testa que o método executa sem erro
        self.assertIsNotNone(venda)

    def test_receber_pagamento_venda_pendente(self):
        """Testa recebimento de pagamento"""
        venda = Venda.objects.create(
            cliente=self.cliente,
            forma_pagamento="FIADO",
            status="FINALIZADA",
            status_pagamento="PENDENTE",
            total=Decimal("50.00"),
        )

        venda.receber_pagamento()

        self.assertEqual(venda.status_pagamento, "PAGO")

    def test_receber_pagamento_venda_ja_paga_gera_erro(self):
        """Testa que não pode receber pagamento de venda já paga"""
        venda = Venda.objects.create(
            forma_pagamento="DINHEIRO",
            status="FINALIZADA",
            status_pagamento="PAGO",
            total=Decimal("50.00"),
        )

        with self.assertRaises(ValueError) as context:
            venda.receber_pagamento()

        self.assertIn("já está paga", str(context.exception))

    def test_receber_pagamento_altera_status(self):
        """Testa que receber_pagamento altera o status para PAGO"""
        venda = Venda(
            forma_pagamento="FIADO",
            status="FINALIZADA",
            status_pagamento="PENDENTE",
            total=Decimal("50.00"),
            numero="TEST_RECEBER",
        )
        venda.save()

        self.assertEqual(venda.status_pagamento, "PENDENTE")

        venda.receber_pagamento()

        self.assertEqual(venda.status_pagamento, "PAGO")


class CategoriaModelTestCase(TestCase):
    """Testes para o model Categoria"""

    def test_str_representation(self):
        """Testa representação string da categoria"""
        categoria = Categoria.objects.create(nome="Bebidas")
        self.assertEqual(str(categoria), "Bebidas")
