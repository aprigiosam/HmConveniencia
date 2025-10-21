from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase


class BackupViewSetTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="backup", password="password")
        self.client.login(username="backup", password="password")

    @patch("core.views.call_command")
    def test_trigger_backup(self, mock_call_command):
        response = self.client.post("/api/backup/trigger_backup/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_call_command.assert_called_once_with("backup_db")
