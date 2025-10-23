# Generated manually for code review improvements
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_alter_alerta_tipo'),
    ]

    operations = [
        # Remove unique=True do campo nome
        migrations.AlterField(
            model_name='categoria',
            name='nome',
            field=models.CharField(max_length=100, verbose_name='Nome'),
        ),
        # Adiciona constraint multi-tenant
        migrations.AddConstraint(
            model_name='categoria',
            constraint=models.UniqueConstraint(
                fields=['nome', 'empresa'],
                name='unique_categoria_por_empresa'
            ),
        ),
    ]
