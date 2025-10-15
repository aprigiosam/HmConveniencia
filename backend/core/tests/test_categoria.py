
import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from core.models import Categoria

@pytest.fixture
def api_client():
    user = User.objects.create_user(username='testuser', password='testpass')
    client = APIClient()
    client.force_authenticate(user=user)
    return client

@pytest.mark.django_db
def test_criar_categoria(api_client):
    """Testa a criação de uma nova categoria."""
    data = {'nome': 'Eletrônicos', 'ativo': True}
    response = api_client.post('/api/categorias/', data, format='json')
    assert response.status_code == 201
    assert Categoria.objects.count() == 1
    assert Categoria.objects.get().nome == 'Eletrônicos'

@pytest.mark.django_db
def test_listar_categorias(api_client):
    """Testa a listagem de categorias."""
    Categoria.objects.create(nome='Alimentos', ativo=True)
    Categoria.objects.create(nome='Bebidas', ativo=False)
    response = api_client.get('/api/categorias/')
    assert response.status_code == 200
    assert len(response.data['results']) == 2
    assert response.data['results'][0]['nome'] == 'Alimentos'

@pytest.mark.django_db
def test_detalhar_categoria(api_client):
    """Testa a recuperação de detalhes de uma categoria específica."""
    categoria = Categoria.objects.create(nome='Limpeza', ativo=True)
    response = api_client.get(f'/api/categorias/{categoria.id}/')
    assert response.status_code == 200
    assert response.data['nome'] == 'Limpeza'

@pytest.mark.django_db
def test_atualizar_categoria(api_client):
    """Testa a atualização de uma categoria existente."""
    categoria = Categoria.objects.create(nome='Padaria', ativo=True)
    data = {'nome': 'Padaria Atualizada', 'ativo': False}
    response = api_client.put(f'/api/categorias/{categoria.id}/', data, format='json')
    assert response.status_code == 200
    categoria.refresh_from_db()
    assert categoria.nome == 'Padaria Atualizada'
    assert categoria.ativo == False

@pytest.mark.django_db
def test_excluir_categoria(api_client):
    """Testa a exclusão de uma categoria."""
    categoria = Categoria.objects.create(nome='Higiene', ativo=True)
    response = api_client.delete(f'/api/categorias/{categoria.id}/')
    assert response.status_code == 204
    assert Categoria.objects.count() == 0
