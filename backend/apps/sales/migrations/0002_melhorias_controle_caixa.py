# Generated migration for control improvements

from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('sales', '0001_initial'),
    ]

    operations = [
        # Adiciona novos campos à SessaoPDV
        migrations.AddField(
            model_name='sessaopdv',
            name='saldo_fechamento_real',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0.00'),
                help_text='Saldo real contado no fechamento',
                max_digits=10
            ),
        ),
        migrations.AddField(
            model_name='sessaopdv',
            name='saldo_fechamento_teorico',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0.00'),
                help_text='Saldo teórico calculado (inicial + vendas - retiradas)',
                max_digits=10
            ),
        ),
        migrations.AddField(
            model_name='sessaopdv',
            name='observacoes_fechamento',
            field=models.TextField(
                blank=True,
                help_text='Observações do fechamento'
            ),
        ),

        # Cria modelo MovimentacaoCaixa
        migrations.CreateModel(
            name='MovimentacaoCaixa',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tipo', models.CharField(
                    choices=[('SANGRIA', 'Sangria'), ('REFORCO', 'Reforço')],
                    max_length=10
                )),
                ('valor', models.DecimalField(decimal_places=2, max_digits=10)),
                ('motivo', models.CharField(help_text='Motivo da movimentação', max_length=255)),
                ('data_hora', models.DateTimeField(default=django.utils.timezone.now)),
                ('observacoes', models.TextField(blank=True)),
                ('responsavel', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='movimentacoes_caixa',
                    to=settings.AUTH_USER_MODEL
                )),
                ('sessao', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='movimentacoes_caixa',
                    to='sales.sessaopdv'
                )),
            ],
            options={
                'verbose_name': 'Movimentação de Caixa',
                'verbose_name_plural': 'Movimentações de Caixa',
                'ordering': ['-data_hora'],
            },
        ),
    ]