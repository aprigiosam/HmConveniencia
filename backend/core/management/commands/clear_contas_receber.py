from django.core.management.base import BaseCommand
from core.models import Venda

class Command(BaseCommand):
    help = 'Limpa todas as contas a receber (Vendas com status_pagamento=PENDENTE).'

    def handle(self, *args, **options):
        contas_a_receber = Venda.objects.filter(status_pagamento='PENDENTE')
        count = contas_a_receber.count()
        contas_a_receber.delete()
        self.stdout.write(self.style.SUCCESS(f'Sucesso: {count} contas a receber foram limpas do banco de dados.'))
