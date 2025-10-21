from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Produto


class LoteAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="testpassword"
        )
        self.client.login(username="testuser", password="testpassword")

        self.produto = Produto.objects.create(
            nome="Produto Teste",
            preco=Decimal("10.00"),
            estoque=Decimal("0.00"),
        )

    def _criar_lote_via_api(self, quantidade=Decimal("5.00")):
        payload = {
            "produto_id": self.produto.id,
            "quantidade": float(quantidade),
            "numero_lote": "LT-123",
            "observacoes": "Teste de entrada",
        }
        response = self.client.post(
            "/api/lotes/entrada_estoque/", payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data

    def test_editar_lote_atualiza_estoque_do_produto(self):
        lote_data = self._criar_lote_via_api(Decimal("10.00"))
        lote_id = lote_data["id"]

        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque, Decimal("10.00"))

        payload = {
            "produto": self.produto.id,
            "quantidade": "15.00",
            "numero_lote": "LT-123",
            "observacoes": "Quantidade ajustada",
            "ativo": True,
        }

        response = self.client.put(
            f"/api/lotes/{lote_id}/", payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque, Decimal("15.00"))

    def test_transferir_lote_para_outro_produto_recalcula_estoques(self):
        lote_data = self._criar_lote_via_api(Decimal("8.00"))
        lote_id = lote_data["id"]

        novo_produto = Produto.objects.create(
            nome="Produto Secundário",
            preco=Decimal("12.00"),
            estoque=Decimal("0.00"),
        )

        payload = {
            "produto": novo_produto.id,
            "quantidade": "6.00",
            "numero_lote": "LT-123",
            "observacoes": "Transferido para outro produto",
            "ativo": True,
        }

        response = self.client.put(
            f"/api/lotes/{lote_id}/", payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.produto.refresh_from_db()
        novo_produto.refresh_from_db()

        self.assertEqual(self.produto.estoque, Decimal("0.00"))
        self.assertEqual(novo_produto.estoque, Decimal("6.00"))

    def test_nao_permite_quantidade_invalida(self):
        lote_data = self._criar_lote_via_api(Decimal("4.00"))
        lote_id = lote_data["id"]

        payload = {
            "produto": self.produto.id,
            "quantidade": 0,
            "numero_lote": "LT-123",
            "observacoes": "Tentativa inválida",
            "ativo": True,
        }

        response = self.client.put(
            f"/api/lotes/{lote_id}/", payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Quantidade deve ser maior que zero", str(response.data))
