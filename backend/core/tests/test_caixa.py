"""
Testes para CaixaViewSet - Foco em validações e atomicidade
"""
from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from core.models import Caixa, Venda


class CaixaViewSetTestCase(APITestCase):
    """Testes para operações de Caixa"""

    def setUp(self):
        """Configuração inicial para cada teste"""
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.login(username='testuser', password='testpass123')

    # ========== TESTES DAS VALIDAÇÕES DE INPUT ==========

    def test_abrir_caixa_com_valor_inicial_valido(self):
        """
        Testa abertura de caixa com valor inicial válido
        """
        url = '/api/caixa/abrir/'
        data = {'valor_inicial': '100.00'}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['valor_inicial'], '100.00')
        self.assertEqual(response.data['status'], 'ABERTO')

    def test_abrir_caixa_com_valor_negativo_retorna_erro(self):
        """
        Testa que não pode abrir caixa com valor inicial negativo
        (validação adicionada nas correções)
        """
        url = '/api/caixa/abrir/'
        data = {'valor_inicial': '-50.00'}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('negativo', response.data['error'].lower())

    def test_abrir_caixa_com_valor_invalido_retorna_erro(self):
        """
        Testa que não pode abrir caixa com valor inválido
        (validação adicionada nas correções)
        """
        url = '/api/caixa/abrir/'
        data = {'valor_inicial': 'abc'}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('inválido', response.data['error'].lower())

    def test_abrir_caixa_quando_ja_existe_caixa_aberto(self):
        """
        Testa que não pode abrir caixa se já existe um aberto
        """
        # Abre primeiro caixa
        Caixa.objects.create(valor_inicial=Decimal('50.00'), status='ABERTO')

        # Tenta abrir segundo caixa
        url = '/api/caixa/abrir/'
        data = {'valor_inicial': '100.00'}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('já existe um caixa aberto', response.data['error'].lower())

    def test_fechar_caixa_com_valor_negativo_retorna_erro(self):
        """
        Testa que não pode fechar caixa com valor final negativo
        (validação adicionada nas correções)
        """
        # Cria caixa aberto
        caixa = Caixa.objects.create(valor_inicial=Decimal('100.00'), status='ABERTO')

        url = f'/api/caixa/{caixa.id}/fechar/'
        data = {'valor_final_informado': '-50.00'}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('negativo', response.data['error'].lower())

    def test_fechar_caixa_com_valor_invalido_retorna_erro(self):
        """
        Testa que não pode fechar caixa com valor inválido
        (validação adicionada nas correções)
        """
        caixa = Caixa.objects.create(valor_inicial=Decimal('100.00'), status='ABERTO')

        url = f'/api/caixa/{caixa.id}/fechar/'
        data = {'valor_final_informado': 'xyz'}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('inválido', response.data['error'].lower())

    # ========== TESTES DE ATOMICIDADE E RACE CONDITION ==========

    def test_fechar_caixa_atomicamente(self):
        """
        Testa que fechar caixa é atômico (@transaction.atomic)
        Garante que select_for_update() previne race condition
        """
        caixa = Caixa.objects.create(valor_inicial=Decimal('100.00'), status='ABERTO')

        # Cria vendas em dinheiro
        Venda.objects.create(
            forma_pagamento='DINHEIRO',
            status='FINALIZADA',
            total=Decimal('50.00'),
            created_at=caixa.data_abertura
        )

        url = f'/api/caixa/{caixa.id}/fechar/'
        data = {
            'valor_final_informado': '150.00',
            'observacoes': 'Fechamento teste'
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'FECHADO')

        # Verifica cálculos
        self.assertEqual(response.data['valor_inicial'], '100.00')
        self.assertEqual(response.data['valor_final_sistema'], '150.00')
        self.assertEqual(response.data['valor_final_informado'], '150.00')
        self.assertEqual(response.data['diferenca'], '0.00')

    def test_nao_pode_fechar_caixa_ja_fechado(self):
        """
        Testa que não pode fechar caixa já fechado
        """
        caixa = Caixa.objects.create(
            valor_inicial=Decimal('100.00'),
            status='FECHADO',
            valor_final_sistema=Decimal('150.00'),
            valor_final_informado=Decimal('150.00'),
            diferenca=Decimal('0.00')
        )

        url = f'/api/caixa/{caixa.id}/fechar/'
        data = {'valor_final_informado': '150.00'}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_status_caixa_retorna_aberto(self):
        """
        Testa endpoint de status quando há caixa aberto
        """
        caixa = Caixa.objects.create(valor_inicial=Decimal('100.00'), status='ABERTO')

        url = '/api/caixa/status/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], caixa.id)
        self.assertEqual(response.data['status'], 'ABERTO')

    def test_status_caixa_retorna_fechado_quando_nao_ha_caixa_aberto(self):
        """
        Testa endpoint de status quando não há caixa aberto
        """
        url = '/api/caixa/status/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'FECHADO')
        self.assertIn('message', response.data)

    def test_historico_caixa_retorna_apenas_fechados(self):
        """
        Testa que histórico retorna apenas caixas fechados
        """
        # Cria caixa aberto
        Caixa.objects.create(valor_inicial=Decimal('50.00'), status='ABERTO')

        # Cria caixas fechados
        Caixa.objects.create(
            valor_inicial=Decimal('100.00'),
            status='FECHADO',
            valor_final_sistema=Decimal('150.00')
        )
        Caixa.objects.create(
            valor_inicial=Decimal('200.00'),
            status='FECHADO',
            valor_final_sistema=Decimal('250.00')
        )

        url = '/api/caixa/historico/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Apenas os fechados
        for caixa in response.data:
            self.assertEqual(caixa['status'], 'FECHADO')
