from decimal import Decimal
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.catalog.models import Categoria, Fornecedor, Produto


class CategoriaViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_list_categorias(self):
        Categoria.objects.create(nome="Eletrônicos")
        Categoria.objects.create(nome="Roupas")

        url = reverse('categoria-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_create_categoria(self):
        url = reverse('categoria-list')
        data = {'nome': 'Nova Categoria'}
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Categoria.objects.count(), 1)
        self.assertEqual(Categoria.objects.first().nome, 'Nova Categoria')

    def test_update_categoria(self):
        categoria = Categoria.objects.create(nome="Categoria Original")
        url = reverse('categoria-detail', args=[categoria.id])
        data = {'nome': 'Categoria Atualizada'}
        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        categoria.refresh_from_db()
        self.assertEqual(categoria.nome, 'Categoria Atualizada')

    def test_delete_categoria(self):
        categoria = Categoria.objects.create(nome="Categoria para Deletar")
        url = reverse('categoria-detail', args=[categoria.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Categoria.objects.count(), 0)


class FornecedorViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def test_list_fornecedores(self):
        Fornecedor.objects.create(cnpj_cpf="12.345.678/0001-90", nome="Fornecedor 1")
        Fornecedor.objects.create(cnpj_cpf="98.765.432/0001-10", nome="Fornecedor 2")

        url = reverse('fornecedor-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_create_fornecedor(self):
        url = reverse('fornecedor-list')
        data = {
            'cnpj_cpf': '12.345.678/0001-90',
            'nome': 'Novo Fornecedor',
            'email': 'novo@fornecedor.com'
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Fornecedor.objects.count(), 1)

    def test_filter_fornecedor_by_nome(self):
        Fornecedor.objects.create(cnpj_cpf="12.345.678/0001-90", nome="ABC Fornecedor")
        Fornecedor.objects.create(cnpj_cpf="98.765.432/0001-10", nome="XYZ Fornecedor")

        url = reverse('fornecedor-list')
        response = self.client.get(url, {'search': 'ABC'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['nome'], 'ABC Fornecedor')


class ProdutoViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

        self.categoria = Categoria.objects.create(nome="Eletrônicos")
        self.fornecedor = Fornecedor.objects.create(
            cnpj_cpf="12.345.678/0001-90",
            nome="Fornecedor Tech"
        )

    def test_list_produtos(self):
        Produto.objects.create(
            sku="PROD001",
            nome="Produto 1",
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("100.00"),
            preco_venda=Decimal("150.00")
        )

        url = reverse('produto-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_create_produto(self):
        url = reverse('produto-list')
        data = {
            'sku': 'PROD001',
            'nome': 'Novo Produto',
            'categoria': self.categoria.id,
            'fornecedor': self.fornecedor.id,
            'preco_custo': '100.00',
            'preco_venda': '150.00'
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Produto.objects.count(), 1)

    def test_search_produto_by_sku(self):
        Produto.objects.create(
            sku="PHONE001",
            nome="iPhone",
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("500.00"),
            preco_venda=Decimal("800.00")
        )

        url = reverse('produto-list')
        response = self.client.get(url, {'search': 'PHONE001'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_produto_by_codigo_barras(self):
        produto = Produto.objects.create(
            sku="PHONE001",
            codigo_barras="1234567890123",
            nome="iPhone",
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("500.00"),
            preco_venda=Decimal("800.00")
        )

        url = reverse('produto-list')
        response = self.client.get(url, {'search': '1234567890123'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], produto.id)

    def test_filter_produto_by_categoria(self):
        categoria2 = Categoria.objects.create(nome="Roupas")

        Produto.objects.create(
            sku="PHONE001",
            nome="iPhone",
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("500.00"),
            preco_venda=Decimal("800.00")
        )
        Produto.objects.create(
            sku="SHIRT001",
            nome="Camisa",
            categoria=categoria2,
            fornecedor=self.fornecedor,
            preco_custo=Decimal("30.00"),
            preco_venda=Decimal("50.00")
        )

        url = reverse('produto-list')
        response = self.client.get(url, {'categoria': self.categoria.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['nome'], 'iPhone')

    def test_unauthorized_access(self):
        self.client.credentials()  # Remove credentials
        url = reverse('produto-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)