
import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from unittest.mock import patch
from django.core.management import call_command

@pytest.fixture
def api_client():
    user = User.objects.create_user(username='testuser', password='testpass')
    client = APIClient()
    client.force_authenticate(user=user)
    return client

@pytest.mark.django_db
@patch('core.views.call_command') # Mock the call_command function directly
def test_trigger_backup(mock_call_command, api_client):
    """Testa se o endpoint de backup aciona o comando de gerenciamento correto."""
    response = api_client.post('/api/backup/trigger_backup/')
    assert response.status_code == 200
    assert response.data['message'] == 'Backup iniciado com sucesso!'
    mock_call_command.assert_called_once_with('backup_db')
