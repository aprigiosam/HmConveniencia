# Generated manually
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_sistema_lotes'),
    ]

    operations = [
        migrations.AddField(
            model_name='alerta',
            name='lote',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='alertas',
                to='core.lote',
                verbose_name='Lote'
            ),
        ),
    ]
