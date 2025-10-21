import os
import subprocess
import datetime
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "Performs a PostgreSQL database backup using pg_dump."

    def handle(self, *args, **options):
        db_settings = settings.DATABASES["default"]

        db_name = db_settings["NAME"]
        db_user = db_settings["USER"]
        db_password = db_settings["PASSWORD"]
        db_host = db_settings["HOST"]
        db_port = db_settings["PORT"]

        # Define o nome do arquivo de backup
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = os.path.join(settings.BASE_DIR, "backups")
        os.makedirs(backup_dir, exist_ok=True)
        backup_file = os.path.join(backup_dir, f"db_backup_{timestamp}.sql")

        # Comando pg_dump
        pg_dump_cmd = [
            "pg_dump",
            "-Fc",  # Formato customizado (recomendado para pg_restore)
            "-h",
            db_host,
            "-p",
            db_port,
            "-U",
            db_user,
            "-d",
            db_name,
            "-f",
            backup_file,
        ]

        # Define a variável de ambiente PGPASSWORD para pg_dump
        env = os.environ.copy()
        env["PGPASSWORD"] = db_password

        self.stdout.write(
            self.style.SUCCESS(f"Iniciando backup do banco de dados {db_name}...")
        )

        try:
            subprocess.run(pg_dump_cmd, env=env, check=True)
            self.stdout.write(
                self.style.SUCCESS(f"Backup concluído com sucesso: {backup_file}")
            )
        except subprocess.CalledProcessError as e:
            self.stderr.write(self.style.ERROR(f"Erro ao executar pg_dump: {e}"))
            self.stderr.write(self.style.ERROR(f"Saída de erro: {e.stderr}"))
        except FileNotFoundError:
            self.stderr.write(
                self.style.ERROR(
                    "pg_dump não encontrado. Certifique-se de que o PostgreSQL client está instalado e no PATH."
                )
            )

        # TODO: Implementar upload para serviço de nuvem aqui
        # TODO: Implementar limpeza de backups antigos aqui
