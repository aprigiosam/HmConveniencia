"""
Testes para Serializers - Validações e transformações de dados
"""

from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from core.models import Cliente, Produto, Venda, Categoria
from core.serializers import ClienteSerializer, ProdutoSerializer, VendaCreateSerializer


class ClienteSerializerTestCase(TestCase):
    """Testes para ClienteSerializer"""

    def test_saldo_devedor_serializado(self):
        """Testa que saldo devedor é incluído no serializer"""
        cliente = Cliente.objects.create(
            nome="João Silva", limite_credito=Decimal("1000.00")
        )

        # Cria venda fiado
        Venda.objects.create(
            cliente=cliente,
            status="FINALIZADA",
            status_pagamento="PENDENTE",
            total=Decimal("250.00"),
            forma_pagamento="FIADO",
        )

        serializer = ClienteSerializer(cliente)
        self.assertEqual(serializer.data["saldo_devedor"], 250.0)

    def test_validate_cpf_vazio_retorna_none(self):
        """Testa que CPF vazio retorna None"""
        data = {"nome": "Teste", "cpf": "", "limite_credito": "500.00"}
        serializer = ClienteSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        # CPF vazio deve ser convertido para None
        self.assertIsNone(serializer.validated_data.get("cpf"))


class ProdutoSerializerTestCase(TestCase):
    """Testes para ProdutoSerializer"""

    def setUp(self):
        self.categoria = Categoria.objects.create(nome="Bebidas")
        self.produto = Produto.objects.create(
            nome="Coca-Cola",
            preco=Decimal("8.00"),
            preco_custo=Decimal("5.00"),
            estoque=Decimal("50"),
            categoria=self.categoria,
            data_validade=date.today() + timedelta(days=5),
        )

    def test_margem_lucro_serializada(self):
        """Testa que margem de lucro é incluída"""
        serializer = ProdutoSerializer(self.produto)
        # (8 - 5) / 5 * 100 = 60%
        self.assertEqual(serializer.data["margem_lucro"], 60.0)

    def test_esta_vencido_serializado(self):
        """Testa que esta_vencido é incluído"""
        serializer = ProdutoSerializer(self.produto)
        self.assertFalse(serializer.data["esta_vencido"])

    def test_dias_para_vencer_serializado(self):
        """Testa que dias_para_vencer é incluído"""
        serializer = ProdutoSerializer(self.produto)
        self.assertEqual(serializer.data["dias_para_vencer"], 5)

    def test_proximo_vencimento_serializado(self):
        """Testa que proximo_vencimento é incluído"""
        serializer = ProdutoSerializer(self.produto)
        self.assertTrue(serializer.data["proximo_vencimento"])


class VendaCreateSerializerTestCase(TestCase):
    """Testes para VendaCreateSerializer - Validações críticas"""

    def setUp(self):
        self.categoria = Categoria.objects.create(nome="Bebidas")
        self.produto = Produto.objects.create(
            nome="Coca-Cola",
            preco=Decimal("10.00"),
            estoque=Decimal("50"),
            categoria=self.categoria,
        )
        self.produto_inativo = Produto.objects.create(
            nome="Produto Inativo",
            preco=Decimal("5.00"),
            estoque=Decimal("10"),
            ativo=False,
        )
        self.cliente = Cliente.objects.create(
            nome="João Silva", limite_credito=Decimal("100.00")
        )
        self.cliente_inativo = Cliente.objects.create(
            nome="Cliente Inativo", limite_credito=Decimal("500.00"), ativo=False
        )

    # ========== TESTES DE VALIDAÇÃO FIADO ==========

    def test_fiado_sem_cliente_retorna_erro(self):
        """Testa que venda fiado sem cliente retorna erro"""
        data = {
            "forma_pagamento": "FIADO",
            "data_vencimento": date.today() + timedelta(days=30),
            "itens": [{"produto_id": str(self.produto.id), "quantidade": "2"}],
        }
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        self.assertIn("cliente_id", str(context.exception))

    def test_fiado_sem_data_vencimento_retorna_erro(self):
        """Testa que venda fiado sem data de vencimento retorna erro"""
        data = {
            "forma_pagamento": "FIADO",
            "cliente_id": self.cliente.id,
            "itens": [{"produto_id": str(self.produto.id), "quantidade": "2"}],
        }
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        self.assertIn("data_vencimento", str(context.exception))

    def test_fiado_data_vencimento_passado_retorna_erro(self):
        """Testa que data de vencimento no passado retorna erro"""
        data = {
            "forma_pagamento": "FIADO",
            "cliente_id": self.cliente.id,
            "data_vencimento": date.today() - timedelta(days=1),
            "itens": [{"produto_id": str(self.produto.id), "quantidade": "2"}],
        }
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        self.assertIn("passado", str(context.exception))

    def test_cliente_inativo_retorna_erro(self):
        """Testa que venda para cliente inativo retorna erro"""
        data = {
            "forma_pagamento": "FIADO",
            "cliente_id": self.cliente_inativo.id,
            "data_vencimento": date.today() + timedelta(days=30),
            "itens": [{"produto_id": str(self.produto.id), "quantidade": "2"}],
        }
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        self.assertIn("inativo", str(context.exception))

    def test_limite_credito_excedido_retorna_erro(self):
        """Testa que exceder limite de crédito retorna erro com detalhes"""
        # Cliente tem limite de 100, tenta comprar 120
        data = {
            "forma_pagamento": "FIADO",
            "cliente_id": self.cliente.id,
            "data_vencimento": date.today() + timedelta(days=30),
            "itens": [{"produto_id": str(self.produto.id), "quantidade": "12"}],
        }
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        error_msg = str(context.exception)
        self.assertIn("limite", error_msg.lower())
        self.assertIn("100.00", error_msg)  # Limite
        self.assertIn("120.00", error_msg)  # Tentando

    def test_cliente_nao_existente_retorna_erro(self):
        """Testa que cliente inexistente retorna erro"""
        data = {
            "forma_pagamento": "FIADO",
            "cliente_id": 99999,
            "data_vencimento": date.today() + timedelta(days=30),
            "itens": [{"produto_id": str(self.produto.id), "quantidade": "2"}],
        }
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        self.assertIn("não encontrado", str(context.exception))

    # ========== TESTES DE VALIDAÇÃO DE ITENS ==========

    def test_itens_vazio_retorna_erro(self):
        """Testa que venda sem itens retorna erro"""
        data = {"forma_pagamento": "DINHEIRO", "itens": []}
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        # DRF retorna "Esta lista não pode estar vazia" para allow_empty=False
        self.assertIn("itens", str(context.exception))

    def test_item_sem_produto_id_retorna_erro(self):
        """Testa que item sem produto_id retorna erro"""
        data = {"forma_pagamento": "DINHEIRO", "itens": [{"quantidade": "2"}]}
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        self.assertIn("produto_id", str(context.exception))

    def test_quantidade_zero_retorna_erro(self):
        """Testa que quantidade zero retorna erro"""
        data = {
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": str(self.produto.id), "quantidade": "0"}],
        }
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        self.assertIn("maior que zero", str(context.exception))

    def test_produto_inativo_retorna_erro(self):
        """Testa que produto inativo não pode ser vendido"""
        data = {
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": str(self.produto_inativo.id), "quantidade": "2"}],
        }
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        self.assertIn("inativo", str(context.exception))

    def test_produto_nao_existente_retorna_erro(self):
        """Testa que produto inexistente retorna erro"""
        data = {
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": "99999", "quantidade": "2"}],
        }
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        self.assertIn("não encontrado", str(context.exception))

    def test_valores_invalidos_retorna_erro(self):
        """Testa que valores inválidos retornam erro"""
        data = {
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": "abc", "quantidade": "xyz"}],
        }
        serializer = VendaCreateSerializer(data=data)

        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)

        self.assertIn("números válidos", str(context.exception))
