from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from apps.catalog.models import Categoria, Fornecedor, Produto
from apps.core.models import Loja


class CategoriaModelTests(TestCase):
    def test_criar_categoria_simples(self):
        categoria = Categoria.objects.create(nome="Alimentos")
        self.assertEqual(categoria.nome, "Alimentos")
        self.assertIsNone(categoria.categoria_pai)

    def test_criar_subcategoria(self):
        pai = Categoria.objects.create(nome="Bebidas")
        subcategoria = Categoria.objects.create(nome="Refrigerantes", categoria_pai=pai)
        self.assertEqual(subcategoria.categoria_pai, pai)

    def test_str_representation(self):
        categoria = Categoria.objects.create(nome="Limpeza")
        self.assertEqual(str(categoria), "Limpeza")


class FornecedorModelTests(TestCase):
    def test_criar_fornecedor_completo(self):
        fornecedor = Fornecedor.objects.create(
            cnpj_cpf="12.345.678/0001-90",
            nome="Fornecedor Teste",
            email="contato@fornecedor.com",
            telefone="(11) 99999-9999",
            endereco="Rua Teste, 123",
            cidade="São Paulo",
            estado="SP",
            cep="01234-567"
        )
        self.assertEqual(fornecedor.nome, "Fornecedor Teste")
        self.assertEqual(fornecedor.cnpj_cpf, "12.345.678/0001-90")

    def test_unique_cnpj_cpf(self):
        Fornecedor.objects.create(cnpj_cpf="12.345.678/0001-90", nome="Fornecedor 1")
        with self.assertRaises(IntegrityError):
            Fornecedor.objects.create(cnpj_cpf="12.345.678/0001-90", nome="Fornecedor 2")

    def test_str_representation(self):
        fornecedor = Fornecedor.objects.create(
            cnpj_cpf="12.345.678/0001-90",
            nome="Fornecedor ABC"
        )
        self.assertEqual(str(fornecedor), "Fornecedor ABC")


class ProdutoModelTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome="Eletrônicos")
        self.fornecedor = Fornecedor.objects.create(
            cnpj_cpf="12.345.678/0001-90",
            nome="Fornecedor Tech"
        )

    def test_criar_produto_completo(self):
        produto = Produto.objects.create(
            sku="PHONE001",
            codigo_barras="1234567890123",
            nome="Smartphone",
            descricao="Smartphone com 128GB",
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("500.00"),
            preco_venda=Decimal("800.00"),
            peso=0.180,
            unidade_medida="UN"
        )
        self.assertEqual(produto.nome, "Smartphone")
        self.assertEqual(produto.preco_custo, Decimal("500.00"))
        self.assertEqual(produto.preco_venda, Decimal("800.00"))

    def test_unique_sku(self):
        Produto.objects.create(
            sku="PHONE001",
            nome="Produto 1",
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("100.00"),
            preco_venda=Decimal("150.00")
        )
        with self.assertRaises(IntegrityError):
            Produto.objects.create(
                sku="PHONE001",
                nome="Produto 2",
                categoria=self.categoria,
                fornecedor=self.fornecedor,
                preco_custo=Decimal("200.00"),
                preco_venda=Decimal("300.00")
            )

    def test_unique_codigo_barras(self):
        Produto.objects.create(
            sku="PHONE001",
            codigo_barras="1234567890123",
            nome="Produto 1",
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("100.00"),
            preco_venda=Decimal("150.00")
        )
        with self.assertRaises(IntegrityError):
            Produto.objects.create(
                sku="PHONE002",
                codigo_barras="1234567890123",
                nome="Produto 2",
                categoria=self.categoria,
                fornecedor=self.fornecedor,
                preco_custo=Decimal("200.00"),
                preco_venda=Decimal("300.00")
            )

    def test_str_representation(self):
        produto = Produto.objects.create(
            sku="PHONE001",
            nome="iPhone 13",
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("500.00"),
            preco_venda=Decimal("800.00")
        )
        self.assertEqual(str(produto), "iPhone 13")

    def test_margem_lucro_calculation(self):
        produto = Produto.objects.create(
            sku="PHONE001",
            nome="Smartphone",
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("100.00"),
            preco_venda=Decimal("150.00")
        )
        # Margem = ((150 - 100) / 150) * 100 = 33.33%
        expected_margin = ((produto.preco_venda - produto.preco_custo) / produto.preco_venda) * 100
        self.assertAlmostEqual(float(expected_margin), 33.33, places=2)