from decimal import Decimal
from datetime import timedelta

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone

from core.models import Produto, Lote


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

    def test_entrada_estoque_com_quantidade_invalida(self):
        payload = {
            "produto_id": self.produto.id,
            "quantidade": 0,
        }
        response = self.client.post("/api/lotes/entrada_estoque/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Quantidade deve ser maior que zero", str(response.data))

    def test_baixar_estoque_do_lote(self):
        lote_data = self._criar_lote_via_api(Decimal("6.00"))
        lote_id = lote_data["id"]

        response = self.client.post(
            f"/api/lotes/{lote_id}/baixar_estoque/",
            {"quantidade": "2.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque, Decimal("4.00"))

    def test_baixar_estoque_insuficiente(self):
        lote_data = self._criar_lote_via_api(Decimal("1.00"))
        lote_id = lote_data["id"]

        response = self.client.post(
            f"/api/lotes/{lote_id}/baixar_estoque/",
            {"quantidade": "5.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Quantidade insuficiente", str(response.data))

    def test_listagens_vencidos_e_proximos(self):
        hoje = timezone.now().date()
        vencido = Lote.objects.create(
            produto=self.produto,
            quantidade=Decimal("2.00"),
            data_validade=hoje - timedelta(days=1),
            numero_lote="VENC",
        )
        proximo = Lote.objects.create(
            produto=self.produto,
            quantidade=Decimal("2.00"),
            data_validade=hoje + timedelta(days=3),
            numero_lote="PROX",
        )

        resp_vencidos = self.client.get("/api/lotes/vencidos/")
        self.assertEqual(resp_vencidos.status_code, status.HTTP_200_OK)
        self.assertTrue(any(lote["id"] == vencido.id for lote in resp_vencidos.data))

        resp_proximos = self.client.get("/api/lotes/proximos_vencimento/")
        self.assertEqual(resp_proximos.status_code, status.HTTP_200_OK)
        self.assertTrue(any(lote["id"] == proximo.id for lote in resp_proximos.data))

        resp_por_produto = self.client.get(
            f"/api/lotes/por_produto/?produto_id={self.produto.id}"
        )
        self.assertEqual(resp_por_produto.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_por_produto.data["total_lotes"], 2)
