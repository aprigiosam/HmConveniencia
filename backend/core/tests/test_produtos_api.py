from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Produto, Lote, Fornecedor


class ProdutoCriacaoComLoteTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="produser", password="secret123")
        self.client.login(username="produser", password="secret123")

        self.fornecedor = Fornecedor.objects.create(nome="Fornecedor Inicial")

    def test_criar_produto_com_lote_inicial(self):
        payload = {
            "nome": "Suco de Laranja Natural",
            "preco": "9.90",
            "preco_custo": "5.50",
            "estoque": "0",
            "codigo_barras": "7891231231231",
            "fornecedor": self.fornecedor.id,
            "lote_inicial": {
                "numero_lote": "INICIAL-001",
                "quantidade": "12.00",
                "data_validade": "2025-12-31",
                "preco_custo_lote": "5.40",
                "observacoes": "Primeiro lote cadastrado automaticamente",
            },
        }

        response = self.client.post("/api/produtos/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        produto = Produto.objects.get(id=response.data["id"])
        self.assertEqual(produto.nome, payload["nome"])
        self.assertEqual(produto.estoque, Decimal("12.00"))
        self.assertEqual(produto.preco_custo, Decimal("5.40"))

        lotes = Lote.objects.filter(produto=produto)
        self.assertEqual(lotes.count(), 1)

        lote = lotes.first()
        self.assertEqual(lote.numero_lote, "INICIAL-001")
        self.assertEqual(lote.quantidade, Decimal("12.00"))
        self.assertEqual(str(lote.data_validade), "2025-12-31")
        self.assertEqual(lote.fornecedor, self.fornecedor)

        self.assertIn("lotes", response.data)
        self.assertTrue(response.data["lotes"])
        self.assertEqual(response.data["lotes"][0]["numero_lote"], "INICIAL-001")
