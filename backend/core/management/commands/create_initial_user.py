"""
Management command para criar usuário admin inicial automaticamente
Usado no deploy para garantir que sempre existe um usuário para acessar o sistema
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decouple import config


class Command(BaseCommand):
    help = "Cria usuário admin inicial se não existir"

    def handle(self, *args, **options):
        User = get_user_model()

        # Permite customização via variáveis de ambiente
        admin_username = config("ADMIN_USERNAME", default="admin")
        admin_email = config("ADMIN_EMAIL", default="admin@hmconv.com")
        admin_password = config("ADMIN_PASSWORD", default="admin123")

        if User.objects.filter(username=admin_username).exists():
            self.stdout.write(
                self.style.WARNING(
                    f"✓ Usuário '{admin_username}' já existe, pulando criação"
                )
            )
            return

        try:
            User.objects.create_superuser(
                username=admin_username,
                email=admin_email,
                password=admin_password,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Superusuário criado com sucesso!\n"
                    f"  Username: {admin_username}\n"
                    f"  Email: {admin_email}\n"
                    f"  Senha: {admin_password}"
                )
            )

            # Alerta de segurança para produção
            if admin_password == "admin123":
                self.stdout.write(
                    self.style.WARNING(
                        "\n⚠️  ATENÇÃO: Você está usando a senha padrão 'admin123'!\n"
                        "   Para produção, defina ADMIN_PASSWORD nas variáveis de ambiente.\n"
                        "   Ou altere a senha após o primeiro login."
                    )
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Erro ao criar superusuário: {str(e)}")
            )
            raise
