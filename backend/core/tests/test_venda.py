
import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from decimal import Decimal
from core.models import Produto, Cliente

@pytest.fixture
def api_client():
    user = User.objects.create_user(username='testuser', password='testpass')
    client = APIClient()
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def setup_data():
    produto1 = Produto.objects.create(nome="Produto A", preco=Decimal("10.00"), estoque=20)
    produto2 = Produto.objects.create(nome="Produto B", preco=Decimal("5.50"), estoque=10)
    cliente = Cliente.objects.create(nome="Cliente Teste", limite_credito=Decimal("100.00"))
    return produto1, produto2, cliente

@pytest.mark.django_db
def test_criar_venda_simples_sucesso(api_client, setup_data):
    """Testa a criação de uma venda simples com sucesso."""
    produto1, produto2, _ = setup_data

    venda_data = {
        "forma_pagamento": "DINHEIRO",
        "itens": [
            {"produto_id": str(produto1.id), "quantidade": "2"}, # Total 20.00
            {"produto_id": str(produto2.id), "quantidade": "1"}  # Total 5.50
        ]
    }

    response = api_client.post('/api/vendas/', venda_data, format='json')

    assert response.status_code == 201
    assert response.data['status'] == 'FINALIZADA'
    assert Decimal(response.data['total']) == Decimal("25.50")

    # Verifica se o estoque foi atualizado
    produto1.refresh_from_db()
    produto2.refresh_from_db()
    assert produto1.estoque == 18
    assert produto2.estoque == 9

@pytest.mark.django_db
def test_criar_venda_estoque_insuficiente(api_client, setup_data):
    """Testa que uma venda não pode ser criada com estoque insuficiente."""
    produto1, _, _ = setup_data

    venda_data = {
        "forma_pagamento": "PIX",
        "itens": [
            {"produto_id": str(produto1.id), "quantidade": "25"} # Estoque é 20
        ]
    }

    response = api_client.post('/api/vendas/', venda_data, format='json')

    assert response.status_code == 400
    assert 'Estoque insuficiente' in str(response.data)

@pytest.mark.django_db
def test_criar_venda_fiado_sucesso(api_client, setup_data):
    """Testa a criação de uma venda fiado e verifica o status do pagamento."""
    produto1, _, cliente = setup_data

    venda_data = {
        "forma_pagamento": "FIADO",
        "cliente_id": cliente.id,
        "itens": [
            {"produto_id": str(produto1.id), "quantidade": "3"} # Total 30.00
        ]
    }

    response = api_client.post('/api/vendas/', venda_data, format='json')

    assert response.status_code == 201
    assert response.data['status_pagamento'] == 'PENDENTE'
    assert response.data['cliente'] == cliente.id

    # Verifica o saldo devedor do cliente
    cliente.refresh_from_db()
    assert cliente.saldo_devedor() == Decimal("30.00")

@pytest.mark.django_db
def test_criar_venda_fiado_sem_cliente(api_client, setup_data):
    """Testa que uma venda fiado não pode ser criada sem um cliente."""
    produto1, _, _ = setup_data

    venda_data = {
        "forma_pagamento": "FIADO",
        "itens": [
            {"produto_id": str(produto1.id), "quantidade": "1"}
        ]
    }

    response = api_client.post('/api/vendas/', venda_data, format='json')

    assert response.status_code == 400
    assert 'Cliente é obrigatório' in str(response.data)


@pytest.mark.django_db
def test_cancelar_venda_restaura_estoque(api_client, setup_data):
    """Testa que cancelar uma venda restaura o estoque do produto."""
    produto1, _, _ = setup_data
    estoque_inicial = produto1.estoque

    # Cria uma venda primeiro
    venda_data = {
        "forma_pagamento": "DINHEIRO",
        "itens": [{"produto_id": str(produto1.id), "quantidade": "5"}]
    }
    response_venda = api_client.post('/api/vendas/', venda_data, format='json')
    assert response_venda.status_code == 201
    venda_id = response_venda.data['id']

    # Verifica que o estoque diminuiu
    produto1.refresh_from_db()
    assert produto1.estoque == estoque_inicial - 5

    # Cancela a venda
    response_cancelar = api_client.post(f'/api/vendas/{venda_id}/cancelar/')
    assert response_cancelar.status_code == 200
    assert response_cancelar.data['status'] == 'CANCELADA'

    # Verifica se o estoque foi restaurado
    produto1.refresh_from_db()
    assert produto1.estoque == estoque_inicial


@pytest.mark.django_db
def test_receber_pagamento_venda_fiado(api_client, setup_data):
    """Testa o recebimento de pagamento de uma venda fiado."""
    produto1, _, cliente = setup_data

    # Cria uma venda fiado
    venda_data = {
        "forma_pagamento": "FIADO",
        "cliente_id": cliente.id,
        "itens": [{"produto_id": str(produto1.id), "quantidade": "2"}]
    }
    response_venda = api_client.post('/api/vendas/', venda_data, format='json')
    assert response_venda.status_code == 201
    venda_id = response_venda.data['id']
    assert response_venda.data['status_pagamento'] == 'PENDENTE'

    # Recebe o pagamento
    response_receber = api_client.post(f'/api/vendas/{venda_id}/receber/')
    assert response_receber.status_code == 200
    assert response_receber.data['status_pagamento'] == 'PAGO'

    # Verifica que o saldo devedor do cliente foi zerado
    cliente.refresh_from_db()
    assert cliente.saldo_devedor() == Decimal("0.00")
