from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )

    def test_login_with_valid_credentials(self):
        """Teste de login com credenciais válidas"""
        url = reverse('auth-login')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'testuser')

    def test_login_with_invalid_credentials(self):
        """Teste de login com credenciais inválidas"""
        url = reverse('auth-login')
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_login_with_missing_fields(self):
        """Teste de login com campos obrigatórios faltando"""
        url = reverse('auth-login')
        data = {'username': 'testuser'}  # Senha faltando
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_with_valid_token(self):
        """Teste de logout com token válido"""
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)

        url = reverse('auth-logout')
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verifica se o token foi removido
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_logout_without_token(self):
        """Teste de logout sem token"""
        url = reverse('auth-logout')
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_check_auth_status_with_valid_token(self):
        """Teste de verificação do status de autenticação com token válido"""
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)

        url = reverse('auth-me')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')

    def test_check_auth_status_without_token(self):
        """Teste de verificação do status de autenticação sem token"""
        url = reverse('auth-me')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_creation_on_login(self):
        """Verifica se um token é criado no login"""
        url = reverse('auth-login')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Token.objects.filter(user=self.user).exists())

    def test_multiple_logins_same_user(self):
        """Teste de múltiplos logins do mesmo usuário"""
        url = reverse('auth-login')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }

        # Primeiro login
        response1 = self.client.post(url, data)
        token1 = response1.data['token']

        # Segundo login
        response2 = self.client.post(url, data)
        token2 = response2.data['token']

        # Ambos os logins devem ser bem-sucedidos
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # Verifica se ainda há apenas um token ativo por usuário
        self.assertEqual(Token.objects.filter(user=self.user).count(), 1)


class UserPermissionsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='regular_user',
            password='testpass123'
        )
        self.admin_user = User.objects.create_superuser(
            username='admin_user',
            password='adminpass123',
            email='admin@example.com'
        )

    def test_regular_user_permissions(self):
        """Teste das permissões de usuário regular"""
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)

        # Usuário regular deve ter acesso às APIs básicas
        url = reverse('produto-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_user_permissions(self):
        """Teste das permissões de usuário administrador"""
        token = Token.objects.create(user=self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)

        # Admin deve ter acesso a todas as APIs
        url = reverse('produto-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)