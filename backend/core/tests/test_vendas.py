from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from core.models import Produto, Cliente, Venda, ItemVenda
from decimal import Decimal

class VendaAPITestCase(APITestCase):
    def setUp(self):
        # Create a user for authentication
        self.user = User.objects.create_user(username='testuser', password='testpassword')
        self.client.login(username='testuser', password='testpassword')

        # Create products
        self.produto1 = Produto.objects.create(nome='Produto 1', preco=Decimal('10.00'), estoque=Decimal('20.00'))
        self.produto2 = Produto.objects.create(nome='Produto 2', preco=Decimal('25.50'), estoque=Decimal('15.00'))

        # Create a client
        self.cliente = Cliente.objects.create(nome='Cliente Teste', limite_credito=Decimal('500.00'))

    def test_criar_venda_dinheiro(self):
        """
        Ensure we can create a new sale with money.
        """
        url = '/api/vendas/'
        data = {
            'forma_pagamento': 'DINHEIRO',
            'itens': [
                {'produto_id': self.produto1.id, 'quantidade': 2},
                {'produto_id': self.produto2.id, 'quantidade': 1},
            ]
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Venda.objects.count(), 1)
        self.assertEqual(ItemVenda.objects.count(), 2)

        # Check stock
        self.produto1.refresh_from_db()
        self.produto2.refresh_from_db()
        self.assertEqual(self.produto1.estoque, Decimal('18.00'))
        self.assertEqual(self.produto2.estoque, Decimal('14.00'))

        # Check sale total
        venda = Venda.objects.first()
        expected_total = (Decimal('10.00') * 2) + (Decimal('25.50') * 1)
        self.assertEqual(venda.total, expected_total)
        self.assertEqual(venda.status, 'FINALIZADA')
        self.assertEqual(venda.status_pagamento, 'PAGO')

    def test_criar_venda_fiado(self):
        """
        Ensure we can create a new sale on credit.
        """
        url = '/api/vendas/'
        data = {
            'forma_pagamento': 'FIADO',
            'cliente_id': self.cliente.id,
            'data_vencimento': '2025-12-31',
            'itens': [
                {'produto_id': self.produto1.id, 'quantidade': 5},
            ]
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Venda.objects.count(), 1)

        venda = Venda.objects.first()
        self.assertEqual(venda.cliente, self.cliente)
        self.assertEqual(venda.status, 'FINALIZADA')
        self.assertEqual(venda.status_pagamento, 'PENDENTE')

        # Check stock
        self.produto1.refresh_from_db()
        self.assertEqual(self.produto1.estoque, Decimal('15.00'))

    def test_criar_venda_estoque_insuficiente(self):
        """
        Ensure we cannot create a sale with insufficient stock.
        """
        url = '/api/vendas/'
        data = {
            'forma_pagamento': 'DINHEIRO',
            'itens': [
                {'produto_id': self.produto1.id, 'quantidade': 21}, # More than available stock
            ]
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Venda.objects.count(), 0)
        self.produto1.refresh_from_db()
        self.assertEqual(self.produto1.estoque, Decimal('20.00')) # Stock should not change
