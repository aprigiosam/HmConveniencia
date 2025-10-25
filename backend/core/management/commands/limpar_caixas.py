"""
Management command para limpar histórico de caixas
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Caixa


class Command(BaseCommand):
    help = "Limpa histórico de caixas fechados"

    def add_arguments(self, parser):
        parser.add_argument(
            "--todos",
            action="store_true",
            help="Deleta TODOS os caixas fechados (use com cuidado!)",
        )
        parser.add_argument(
            "--dias",
            type=int,
            help="Deleta caixas fechados com mais de X dias",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Não pede confirmação (use apenas em scripts automatizados)",
        )

    def handle(self, *args, **options):
        todos = options["todos"]
        dias = options["dias"]
        force = options["force"]

        # Valida opções
        if not todos and not dias:
            self.stdout.write(
                self.style.ERROR(
                    "❌ Você deve especificar --todos ou --dias=X\n"
                    "Exemplos:\n"
                    "  python manage.py limpar_caixas --todos\n"
                    "  python manage.py limpar_caixas --dias=30\n"
                )
            )
            return

        # Busca caixas a deletar
        if todos:
            caixas = Caixa.objects.filter(status="FECHADO")
            descricao = "TODOS os caixas fechados"
        else:
            data_limite = timezone.now() - timezone.timedelta(days=dias)
            caixas = Caixa.objects.filter(
                status="FECHADO", data_abertura__lt=data_limite
            )
            descricao = f"caixas fechados com mais de {dias} dias"

        total = caixas.count()

        if total == 0:
            self.stdout.write(
                self.style.WARNING(f"✓ Nenhum caixa encontrado para deletar ({descricao})")
            )
            return

        # Mostra resumo
        self.stdout.write(
            self.style.WARNING(
                f"\n⚠️  ATENÇÃO: Você está prestes a deletar {descricao}!\n"
                f"   Total de caixas a deletar: {total}\n"
            )
        )

        # Pede confirmação (a menos que --force esteja ativo)
        if not force:
            confirmacao = input("Digite 'SIM' para confirmar: ")
            if confirmacao != "SIM":
                self.stdout.write(self.style.ERROR("❌ Operação cancelada"))
                return

        # Deleta
        try:
            caixas.delete()
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ {total} caixa(s) deletado(s) com sucesso!"
                )
            )

            # Estatísticas finais
            total_restante = Caixa.objects.filter(status="FECHADO").count()
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Caixas fechados restantes: {total_restante}"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Erro ao deletar caixas: {str(e)}")
            )
