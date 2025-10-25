# Generated manually for detailed cash register closing

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0019_validade_hibrida'),
    ]

    operations = [
        migrations.AddField(
            model_name='caixa',
            name='total_dinheiro',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Total de vendas em dinheiro',
                max_digits=10,
                null=True,
                verbose_name='Total Dinheiro'
            ),
        ),
        migrations.AddField(
            model_name='caixa',
            name='total_debito',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Total de vendas no débito',
                max_digits=10,
                null=True,
                verbose_name='Total Débito'
            ),
        ),
        migrations.AddField(
            model_name='caixa',
            name='total_credito',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Total de vendas no crédito',
                max_digits=10,
                null=True,
                verbose_name='Total Crédito'
            ),
        ),
        migrations.AddField(
            model_name='caixa',
            name='total_pix',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Total de vendas via PIX',
                max_digits=10,
                null=True,
                verbose_name='Total PIX'
            ),
        ),
        migrations.AddField(
            model_name='caixa',
            name='total_fiado',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Total de vendas fiado',
                max_digits=10,
                null=True,
                verbose_name='Total Fiado'
            ),
        ),
        migrations.AddField(
            model_name='caixa',
            name='total_vendas',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Total geral de vendas (todas as formas)',
                max_digits=10,
                null=True,
                verbose_name='Total de Vendas'
            ),
        ),
    ]
