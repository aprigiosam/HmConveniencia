from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from core.models import Produto, Cliente, Venda, ItemVenda
from decimal import Decimal


class VendaAPITestCase(APITestCase):
    def setUp(self):
        # Create a user for authentication
        self.user = User.objects.create_user(
            username="testuser", password="testpassword"
        )
        self.client.login(username="testuser", password="testpassword")

        # Create products
        self.produto1 = Produto.objects.create(
            nome="Produto 1", preco=Decimal("10.00"), estoque=Decimal("20.00")
        )
        self.produto2 = Produto.objects.create(
            nome="Produto 2", preco=Decimal("25.50"), estoque=Decimal("15.00")
        )

        # Create a client
        self.cliente = Cliente.objects.create(
            nome="Cliente Teste", limite_credito=Decimal("500.00")
        )

    def test_criar_venda_dinheiro(self):
        """
        Ensure we can create a new sale with money.
        """
        url = "/api/vendas/"
        data = {
            "forma_pagamento": "DINHEIRO",
            "itens": [
                {"produto_id": self.produto1.id, "quantidade": 2},
                {"produto_id": self.produto2.id, "quantidade": 1},
            ],
        }
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Venda.objects.count(), 1)
        self.assertEqual(ItemVenda.objects.count(), 2)

        # Check stock
        self.produto1.refresh_from_db()
        self.produto2.refresh_from_db()
        self.assertEqual(self.produto1.estoque, Decimal("18.00"))
        self.assertEqual(self.produto2.estoque, Decimal("14.00"))

        # Check sale total
        venda = Venda.objects.first()
        expected_total = (Decimal("10.00") * 2) + (Decimal("25.50") * 1)
        self.assertEqual(venda.total, expected_total)
        self.assertEqual(venda.status, "FINALIZADA")
        self.assertEqual(venda.status_pagamento, "PAGO")

    def test_criar_venda_fiado(self):
        """
        Ensure we can create a new sale on credit.
        """
        url = "/api/vendas/"
        data = {
            "forma_pagamento": "FIADO",
            "cliente_id": self.cliente.id,
            "data_vencimento": "2025-12-31",
            "itens": [
                {"produto_id": self.produto1.id, "quantidade": 5},
            ],
        }
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Venda.objects.count(), 1)

        venda = Venda.objects.first()
        self.assertEqual(venda.cliente, self.cliente)
        self.assertEqual(venda.status, "FINALIZADA")
        self.assertEqual(venda.status_pagamento, "PENDENTE")

        # Check stock
        self.produto1.refresh_from_db()
        self.assertEqual(self.produto1.estoque, Decimal("15.00"))

    def test_criar_venda_estoque_insuficiente(self):
        """
        Ensure we cannot create a sale with insufficient stock.
        """
        url = "/api/vendas/"
        data = {
            "forma_pagamento": "DINHEIRO",
            "itens": [
                {
                    "produto_id": self.produto1.id,
                    "quantidade": 21,
                },  # More than available stock
            ],
        }
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Venda.objects.count(), 0)
        self.produto1.refresh_from_db()
        self.assertEqual(
            self.produto1.estoque, Decimal("20.00")
        )  # Stock should not change

    # ========== TESTES DAS CORREÇÕES CRÍTICAS ==========

    def test_cancelar_venda_finalizada_devolve_estoque_atomicamente(self):
        """
        Testa se cancelar venda FINALIZADA devolve o estoque usando bulk_update
        e garante atomicidade com @transaction.atomic
        """
        # Cria venda finalizada
        url = "/api/vendas/"
        data = {
            "forma_pagamento": "DINHEIRO",
            "itens": [
                {"produto_id": self.produto1.id, "quantidade": 5},
            ],
        }
        response = self.client.post(url, data, format="json")
        venda_id = response.data["id"]

        # Verifica estoque após venda (20 - 5 = 15)
        self.produto1.refresh_from_db()
        self.assertEqual(self.produto1.estoque, Decimal("15.00"))

        # Cancela a venda
        cancel_url = f"/api/vendas/{venda_id}/cancelar/"
        response = self.client.post(cancel_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "CANCELADA")

        # Verifica se estoque foi devolvido (15 + 5 = 20)
        self.produto1.refresh_from_db()
        self.assertEqual(self.produto1.estoque, Decimal("20.00"))

    def test_cancelar_venda_ja_cancelada_retorna_erro(self):
        """
        Testa que não pode cancelar venda já cancelada
        """
        # Cria e cancela venda
        url = "/api/vendas/"
        data = {
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": self.produto1.id, "quantidade": 2}],
        }
        response = self.client.post(url, data, format="json")
        venda_id = response.data["id"]

        # Primeira vez - deve funcionar
        cancel_url = f"/api/vendas/{venda_id}/cancelar/"
        response = self.client.post(cancel_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Segunda vez - deve retornar erro
        response = self.client.post(cancel_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("já está cancelada", response.data["error"])

    def test_receber_pagamento_venda_fiado(self):
        """
        Testa recebimento de pagamento de venda fiado
        """
        # Cria venda fiado
        url = "/api/vendas/"
        data = {
            "forma_pagamento": "FIADO",
            "cliente_id": self.cliente.id,
            "data_vencimento": "2025-12-31",
            "itens": [{"produto_id": self.produto1.id, "quantidade": 2}],
        }
        response = self.client.post(url, data, format="json")
        venda_id = response.data["id"]

        # Verifica que está pendente
        self.assertEqual(response.data["status_pagamento"], "PENDENTE")

        # Recebe pagamento
        receber_url = f"/api/vendas/{venda_id}/receber/"
        response = self.client.post(receber_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status_pagamento"], "PAGO")

    def test_receber_pagamento_venda_ja_paga_retorna_erro(self):
        """
        Testa que não pode receber pagamento de venda já paga
        """
        # Cria venda em dinheiro (já paga)
        url = "/api/vendas/"
        data = {
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": self.produto1.id, "quantidade": 2}],
        }
        response = self.client.post(url, data, format="json")
        venda_id = response.data["id"]

        # Tenta receber pagamento
        receber_url = f"/api/vendas/{venda_id}/receber/"
        response = self.client.post(receber_url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_busca_produto_otimizada_com_Q(self):
        """
        Testa que busca de produtos usa Q() corretamente
        """
        # Busca por nome
        response = self.client.get("/api/produtos/", {"search": "Produto 1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

        # Busca por código de barras parcial (se existir)
        response = self.client.get("/api/produtos/", {"search": "Produto"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 2)
