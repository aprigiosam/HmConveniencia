
import pytest
import time
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from decimal import Decimal
from core.models import Caixa, Venda


@pytest.mark.django_db
def test_caixa_flow():
    """Testa o fluxo completo de abrir, movimentar e fechar o caixa."""
    # 1. Setup: Cria usuário e cliente da API
    user = User.objects.create_user(username='testuser', password='testpass')
    client = APIClient()
    client.force_authenticate(user=user)

    # 2. Verifica se não há caixa aberto inicialmente
    response = client.get('/api/caixa/status/')
    assert response.status_code == 200
    assert response.data['status'] == 'FECHADO'

    # 3. Abre um novo caixa
    response = client.post('/api/caixa/abrir/', {'valor_inicial': '100.00'})
    assert response.status_code == 201
    assert response.data['status'] == 'ABERTO'
    assert Decimal(response.data['valor_inicial']) == Decimal('100.00')
    caixa_id = response.data['id']

    # 4. Tenta abrir outro caixa enquanto um já está aberto (deve falhar)
    response = client.post('/api/caixa/abrir/', {'valor_inicial': '50.00'})
    assert response.status_code == 400

    # 5. Cria uma venda em dinheiro para simular atividade
    Venda.objects.create(
        status='FINALIZADA',
        forma_pagamento='DINHEIRO',
        total=Decimal('75.50')
    )

    time.sleep(1) # Garante um timestamp diferente para a próxima venda

    # Cria uma venda em cartão (não deve entrar no cálculo do caixa)
    Venda.objects.create(
        status='FINALIZADA',
        forma_pagamento='CREDITO',
        total=Decimal('50.00')
    )

    # 6. Adiciona uma movimentação (SANGRIA)
    response = client.post(
        f'/api/caixa/{caixa_id}/movimentar/',
        {'tipo': 'SANGRIA', 'valor': '20.00', 'descricao': 'Retirada para despesas'}
    )
    assert response.status_code == 201
    assert Decimal(response.data['valor']) == Decimal('20.00')

    # 7. Adiciona uma movimentação (SUPRIMENTO)
    response = client.post(
        f'/api/caixa/{caixa_id}/movimentar/',
        {'tipo': 'SUPRIMENTO', 'valor': '10.00', 'descricao': 'Adição de troco'}
    )
    assert response.status_code == 201
    assert Decimal(response.data['valor']) == Decimal('10.00')

    # 8. Fecha o caixa
    valor_informado = Decimal('165.50') # Valor esperado: 100 (inicial) + 75.50 (venda) - 20 (sangria) + 10 (suprimento) = 165.50
    response = client.post(
        f'/api/caixa/{caixa_id}/fechar/',
        {'valor_final_informado': str(valor_informado), 'observacoes': 'Tudo certo'}
    )
    assert response.status_code == 200
    assert response.data['status'] == 'FECHADO'

    # Verifica os cálculos
    assert Decimal(response.data['valor_final_sistema']) == Decimal('165.50')
    assert Decimal(response.data['valor_final_informado']) == valor_informado
    assert Decimal(response.data['diferenca']) == Decimal('0.00')

    # 9. Verifica o histórico
    response = client.get('/api/caixa/historico/')
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['id'] == caixa_id
