from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from core.services.openfoodfacts import OpenFoodFactsError


class ProdutoOpenFoodFactsAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="tester", password="secret123"
        )
        self.client.login(username="tester", password="secret123")

    def test_parametros_obrigatorios(self):
        response = self.client.get("/api/produtos/buscar-openfood/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    @patch("core.views.openfoodfacts.search_products")
    def test_busca_por_termo(self, mock_search):
        mock_search.return_value = [
            {
                "code": "7891234567890",
                "name": "Doritos Queijo Nacho 120g",
                "brand": "Pepsico",
                "quantity": "120 g",
                "categories": ["Snacks", "Salgadinhos"],
                "image_small_url": "https://img.example/doritos-small.jpg",
                "image_url": "https://img.example/doritos.jpg",
                "data_source": "Open Food Facts",
                "nutriscore_grade": "d",
                "ecoscore_grade": None,
            }
        ]

        response = self.client.get("/api/produtos/buscar-openfood/?q=doritos")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["code"], "7891234567890")
        mock_search.assert_called_once_with("doritos", page=1, page_size=10)

    @patch("core.views.openfoodfacts.fetch_by_code")
    def test_busca_por_codigo(self, mock_fetch):
        mock_fetch.return_value = {
            "code": "7891234567890",
            "name": "Produto teste",
            "brand": None,
            "quantity": None,
            "categories": [],
            "image_small_url": None,
            "image_url": None,
            "data_source": "Open Food Facts",
            "nutriscore_grade": None,
            "ecoscore_grade": None,
        }

        response = self.client.get(
            "/api/produtos/buscar-openfood/?code=7891234567890"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["code"], "7891234567890")
        mock_fetch.assert_called_once_with("7891234567890")

    @patch(
        "core.views.openfoodfacts.fetch_by_code",
        side_effect=OpenFoodFactsError("Falha ao consultar a API"),
    )
    def test_quando_api_retorna_erro(self, mock_fetch):
        response = self.client.get(
            "/api/produtos/buscar-openfood/?code=0000000000000"
        )

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("detail", response.data)
        mock_fetch.assert_called_once()
