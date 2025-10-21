from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Fornecedor


class FornecedorAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="testpassword"
        )
        self.client.login(username="testuser", password="testpassword")

    def test_create_fornecedor(self):
        payload = {
            "nome": "Fornecedor Teste",
            "nome_fantasia": "Fornecedor LTDA",
            "cnpj": "12.345.678/0001-90",
            "telefone": "(11) 99999-9999",
            "email": "contato@fornecedor.com",
            "endereco": "Rua do Teste, 123",
            "observacoes": "Entrega rápida",
            "ativo": True,
        }

        response = self.client.post("/api/fornecedores/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Fornecedor.objects.count(), 1)
        fornecedor = Fornecedor.objects.first()
        self.assertEqual(fornecedor.nome, payload["nome"])
        self.assertEqual(fornecedor.nome_fantasia, payload["nome_fantasia"])
        self.assertEqual(fornecedor.cnpj, payload["cnpj"])

    def test_list_fornecedor_filters_by_ativo(self):
        Fornecedor.objects.create(nome="Fornecedor 1", ativo=True)
        Fornecedor.objects.create(nome="Fornecedor 2", ativo=False)

        response = self.client.get("/api/fornecedores/?ativo=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["nome"], "Fornecedor 1")

    def test_update_fornecedor(self):
        fornecedor = Fornecedor.objects.create(nome="Fornecedor 1")

        payload = {"nome": "Fornecedor Atualizado", "ativo": False}
        response = self.client.put(
            f"/api/fornecedores/{fornecedor.id}/", payload, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        fornecedor.refresh_from_db()
        self.assertEqual(fornecedor.nome, payload["nome"])
        self.assertFalse(fornecedor.ativo)
