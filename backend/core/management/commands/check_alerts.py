"""
Comando para verificar e criar alertas do sistema
Uso: python manage.py check_alerts [--verbose]
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.services.alert_service import AlertService


class Command(BaseCommand):
    help = 'Verifica e cria alertas do sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostra detalhes dos alertas criados',
        )

    def handle(self, *args, **options):
        verbose = options['verbose']

        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS(f'🔔 Verificando Alertas - {timezone.now().strftime("%d/%m/%Y %H:%M:%S")}'))
        self.stdout.write(self.style.SUCCESS('=' * 60))

        # Executa todas as verificações
        resultado = AlertService.verificar_todos()

        total_criados = resultado['total_criados']
        detalhes = resultado['detalhes']

        # Mostra resumo
        self.stdout.write('\n📊 RESUMO:')
        self.stdout.write(f'  Total de novos alertas criados: {total_criados}')
        self.stdout.write('')

        # Mostra detalhes por tipo
        tipos_info = {
            'limite_credito': ('💳 Limite de Crédito', self.style.WARNING),
            'produtos_vencendo': ('📅 Produtos Vencendo', self.style.WARNING),
            'produtos_vencidos': ('❌ Produtos Vencidos', self.style.ERROR),
            'estoque_baixo': ('📦 Estoque Baixo', self.style.WARNING),
            'estoque_zerado': ('🚫 Estoque Zerado', self.style.ERROR),
            'contas_vencidas': ('💰 Contas Vencidas', self.style.WARNING),
            'diferenca_caixa': ('💵 Diferença de Caixa', self.style.WARNING),
        }

        for tipo, alertas in detalhes.items():
            if alertas:
                nome, estilo = tipos_info.get(tipo, (tipo, self.style.SUCCESS))
                self.stdout.write(estilo(f'\n{nome}: {len(alertas)} alerta(s)'))

                if verbose:
                    for alerta in alertas:
                        self.stdout.write(f'  - [{alerta.get_prioridade_display()}] {alerta.titulo}')

        # Mostra resumo geral de alertas pendentes
        self.stdout.write('\n' + '=' * 60)
        resumo = AlertService.obter_resumo()

        self.stdout.write(self.style.SUCCESS('\n📋 ALERTAS PENDENTES (não resolvidos):'))
        self.stdout.write(f'  Total: {resumo["total_pendentes"]}')
        self.stdout.write(f'  Não lidos: {resumo["nao_lidos"]}')

        if resumo['criticos'] > 0:
            self.stdout.write(self.style.ERROR(f'  🔴 Críticos: {resumo["criticos"]}'))
        if resumo['altos'] > 0:
            self.stdout.write(self.style.WARNING(f'  ⚠️  Altos: {resumo["altos"]}'))
        if resumo['medios'] > 0:
            self.stdout.write(f'  🟡 Médios: {resumo["medios"]}')
        if resumo['baixos'] > 0:
            self.stdout.write(f'  🟢 Baixos: {resumo["baixos"]}')

        self.stdout.write('\n' + '=' * 60)

        if total_criados > 0:
            self.stdout.write(self.style.SUCCESS(f'\n✅ {total_criados} novo(s) alerta(s) criado(s) com sucesso!'))
        else:
            self.stdout.write(self.style.SUCCESS('\n✅ Nenhum novo alerta detectado.'))

        self.stdout.write('')
