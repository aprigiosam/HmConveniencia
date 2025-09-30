from decimal import Decimal
from django.contrib.auth.models import User
from django.test import TestCase
from django.core.exceptions import ValidationError

from apps.catalog.models import Categoria, Fornecedor, Produto
from apps.core.models import Loja
from apps.sales.models import FormaPagamento, ItemVenda, Venda


class FormaPagamentoModelTests(TestCase):
    def test_criar_forma_pagamento(self):
        forma = FormaPagamento.objects.create(
            nome="Cartão de Crédito",
            taxa_juros=Decimal("2.5"),
            aceita_parcelamento=True
        )
        self.assertEqual(forma.nome, "Cartão de Crédito")
        self.assertEqual(forma.taxa_juros, Decimal("2.5"))
        self.assertTrue(forma.aceita_parcelamento)

    def test_str_representation(self):
        forma = FormaPagamento.objects.create(nome="PIX")
        self.assertEqual(str(forma), "PIX")


class VendaModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='vendedor', password='pass123')
        self.loja = Loja.objects.create(cnpj="12.345.678/0001-90", nome="Loja Teste")
        self.forma_pagamento = FormaPagamento.objects.create(nome="Dinheiro")

        categoria = Categoria.objects.create(nome="Alimentos")
        fornecedor = Fornecedor.objects.create(
            cnpj_cpf="98.765.432/0001-10",
            nome="Fornecedor Teste"
        )
        self.produto = Produto.objects.create(
            sku="PROD001",
            nome="Produto Teste",
            categoria=categoria,
            fornecedor=fornecedor,
            preco_custo=Decimal("10.00"),
            preco_venda=Decimal("15.00")
        )

    def test_criar_venda(self):
        venda = Venda.objects.create(
            loja=self.loja,
            vendedor=self.user,
            forma_pagamento=self.forma_pagamento,
            valor_total=Decimal("15.00"),
            valor_pago=Decimal("20.00"),
            valor_troco=Decimal("5.00")
        )

        self.assertEqual(venda.loja, self.loja)
        self.assertEqual(venda.vendedor, self.user)
        self.assertEqual(venda.valor_total, Decimal("15.00"))
        self.assertEqual(venda.valor_troco, Decimal("5.00"))

    def test_str_representation(self):
        venda = Venda.objects.create(
            loja=self.loja,
            vendedor=self.user,
            forma_pagamento=self.forma_pagamento,
            valor_total=Decimal("15.00")
        )
        expected = f"Venda #{venda.id} - {venda.data_venda.strftime('%d/%m/%Y')}"
        self.assertEqual(str(venda), expected)

    def test_venda_com_desconto(self):
        venda = Venda.objects.create(
            loja=self.loja,
            vendedor=self.user,
            forma_pagamento=self.forma_pagamento,
            valor_total=Decimal("100.00"),
            desconto=Decimal("10.00")
        )

        self.assertEqual(venda.desconto, Decimal("10.00"))
        # O valor final seria 90.00 após o desconto


class ItemVendaModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='vendedor', password='pass123')
        self.loja = Loja.objects.create(cnpj="12.345.678/0001-90", nome="Loja Teste")
        self.forma_pagamento = FormaPagamento.objects.create(nome="Dinheiro")

        categoria = Categoria.objects.create(nome="Alimentos")
        fornecedor = Fornecedor.objects.create(
            cnpj_cpf="98.765.432/0001-10",
            nome="Fornecedor Teste"
        )
        self.produto = Produto.objects.create(
            sku="PROD001",
            nome="Produto Teste",
            categoria=categoria,
            fornecedor=fornecedor,
            preco_custo=Decimal("10.00"),
            preco_venda=Decimal("15.00")
        )

        self.venda = Venda.objects.create(
            loja=self.loja,
            vendedor=self.user,
            forma_pagamento=self.forma_pagamento,
            valor_total=Decimal("30.00")
        )

    def test_criar_item_venda(self):
        item = ItemVenda.objects.create(
            venda=self.venda,
            produto=self.produto,
            quantidade=Decimal("2"),
            preco_unitario=Decimal("15.00"),
            subtotal=Decimal("30.00")
        )

        self.assertEqual(item.venda, self.venda)
        self.assertEqual(item.produto, self.produto)
        self.assertEqual(item.quantidade, Decimal("2"))
        self.assertEqual(item.subtotal, Decimal("30.00"))

    def test_calcular_subtotal_automaticamente(self):
        item = ItemVenda.objects.create(
            venda=self.venda,
            produto=self.produto,
            quantidade=Decimal("3"),
            preco_unitario=Decimal("15.00")
        )

        # Se o modelo tem um save() que calcula automaticamente
        expected_subtotal = item.quantidade * item.preco_unitario
        self.assertEqual(item.subtotal, expected_subtotal)

    def test_str_representation(self):
        item = ItemVenda.objects.create(
            venda=self.venda,
            produto=self.produto,
            quantidade=Decimal("2"),
            preco_unitario=Decimal("15.00"),
            subtotal=Decimal("30.00")
        )
        expected = f"{item.quantidade}x {item.produto.nome}"
        self.assertEqual(str(item), expected)

    def test_item_com_desconto(self):
        item = ItemVenda.objects.create(
            venda=self.venda,
            produto=self.produto,
            quantidade=Decimal("1"),
            preco_unitario=Decimal("15.00"),
            desconto=Decimal("2.00"),
            subtotal=Decimal("13.00")
        )

        self.assertEqual(item.desconto, Decimal("2.00"))
        self.assertEqual(item.subtotal, Decimal("13.00"))

    def test_quantidade_positiva(self):
        # Teste para verificar se a quantidade deve ser positiva
        with self.assertRaises(ValidationError):
            item = ItemVenda(
                venda=self.venda,
                produto=self.produto,
                quantidade=Decimal("-1"),
                preco_unitario=Decimal("15.00")
            )
            item.full_clean()  # Chama as validações do modelo