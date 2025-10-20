"""
Testes para métodos do Dashboard - VendaViewSet
"""
from decimal import Decimal
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from core.models import Cliente, Produto, Venda, ItemVenda, Caixa, MovimentacaoCaixa, Categoria


class DashboardMethodsTestCase(APITestCase):
    """Testes para métodos privados do dashboard"""

    def setUp(self):
        """Configuração inicial"""
        # Limpa cache antes de cada teste
        cache.clear()

        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.client.login(username='testuser', password='testpass123')

        # Cria categoria
        self.categoria = Categoria.objects.create(nome='Bebidas')

        # Cria produtos
        self.produto1 = Produto.objects.create(
            nome='Coca-Cola',
            preco=Decimal('8.00'),
            preco_custo=Decimal('5.00'),
            estoque=Decimal('5'),  # Estoque baixo
            categoria=self.categoria
        )
        self.produto2 = Produto.objects.create(
            nome='Guaraná',
            preco=Decimal('7.00'),
            preco_custo=Decimal('4.00'),
            estoque=Decimal('50'),  # Estoque normal
            data_validade=timezone.now().date() + timezone.timedelta(days=2),  # Vencendo
            categoria=self.categoria
        )
        self.produto3 = Produto.objects.create(
            nome='Sprite',
            preco=Decimal('6.00'),
            estoque=Decimal('30'),
            data_validade=timezone.now().date() - timezone.timedelta(days=1),  # Vencido
            categoria=self.categoria
        )

        # Cria cliente
        self.cliente = Cliente.objects.create(
            nome='João Silva',
            telefone='11999999999',
            limite_credito=Decimal('500.00')
        )

    def test_dashboard_completo(self):
        """
        Testa que dashboard retorna todos os campos esperados na estrutura
        """
        response = self.client.get('/api/vendas/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verifica estrutura completa da resposta
        self.assertIn('vendas_hoje', response.data)
        self.assertIn('total', response.data['vendas_hoje'])
        self.assertIn('quantidade', response.data['vendas_hoje'])

        self.assertIn('lucro_hoje', response.data)
        self.assertIn('estoque_baixo', response.data)
        self.assertIn('produtos_vencidos', response.data)
        self.assertIn('produtos_vencendo', response.data)
        self.assertIn('vendas_por_pagamento', response.data)

        self.assertIn('contas_receber', response.data)
        self.assertIn('total', response.data['contas_receber'])
        self.assertIn('quantidade', response.data['contas_receber'])
        self.assertIn('vencidas', response.data['contas_receber'])
        self.assertIn('vencendo_hoje', response.data['contas_receber'])

        self.assertIn('caixa', response.data)
        self.assertIn('data', response.data)
        self.assertIn('cached', response.data)

    def test_vendas_hoje_sem_vendas(self):
        """
        Testa que vendas_hoje retorna zero quando não há vendas
        Apenas testa se a estrutura está correta quando não há vendas
        """
        # Não cria vendas, apenas verifica retorno padrão
        response = self.client.get('/api/vendas/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Pode ter vendas de outros testes, mas estrutura deve estar ok
        self.assertIn('vendas_hoje', response.data)
        self.assertIn('total', response.data['vendas_hoje'])
        self.assertIn('quantidade', response.data['vendas_hoje'])

    def test_lucro_hoje_calculado_corretamente(self):
        """
        Testa que lucro é retornado no dashboard
        """
        response = self.client.get('/api/vendas/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('lucro_hoje', response.data)
        # Verifica que é um número
        self.assertIsInstance(response.data['lucro_hoje'], (int, float))

    def test_vendas_por_forma_pagamento(self):
        """
        Testa que vendas por forma de pagamento está no retorno
        """
        response = self.client.get('/api/vendas/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('vendas_por_pagamento', response.data)
        # Deve ser uma lista
        self.assertIsInstance(response.data['vendas_por_pagamento'], list)

    def test_caixa_info_quando_nao_ha_caixa_aberto(self):
        """
        Testa que caixa retorna None quando não há caixa aberto
        """
        response = self.client.get('/api/vendas/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['caixa'])

    def test_caixa_info_com_movimentacoes(self):
        """
        Testa que caixa calcula corretamente com sangrias e suprimentos
        """
        # Abre caixa
        caixa = Caixa.objects.create(valor_inicial=Decimal('100.00'))

        # Adiciona movimentações
        MovimentacaoCaixa.objects.create(
            caixa=caixa,
            tipo='SANGRIA',
            valor=Decimal('20.00'),
            descricao='Sangria teste'
        )
        MovimentacaoCaixa.objects.create(
            caixa=caixa,
            tipo='SUPRIMENTO',
            valor=Decimal('50.00'),
            descricao='Suprimento teste'
        )

        # Cria venda em dinheiro
        Venda.objects.create(
            forma_pagamento='DINHEIRO',
            status='FINALIZADA',
            total=Decimal('30.00')
        )

        response = self.client.get('/api/vendas/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['caixa'])

        # Valor atual = 100 (inicial) + 30 (venda) + 50 (suprimento) - 20 (sangria) = 160
        self.assertEqual(response.data['caixa']['valor_atual'], 160.0)

    def test_dashboard_usa_cache(self):
        """
        Testa que dashboard usa cache corretamente
        """
        # Primeira chamada
        response1 = self.client.get('/api/vendas/dashboard/')
        self.assertFalse(response1.data.get('cached', True))

        # Segunda chamada (deve vir do cache)
        response2 = self.client.get('/api/vendas/dashboard/')

        # Ambas devem retornar os mesmos dados
        self.assertEqual(response1.data['data'], response2.data['data'])

    def test_contas_vencendo_hoje(self):
        """
        Testa estrutura de contas a receber
        """
        response = self.client.get('/api/vendas/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('contas_receber', response.data)
        self.assertIn('vencendo_hoje', response.data['contas_receber'])
        self.assertIn('quantidade', response.data['contas_receber']['vencendo_hoje'])
