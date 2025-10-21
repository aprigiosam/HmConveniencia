# Generated manually
from django.db import migrations, models
import django.db.models.deletion
from decimal import Decimal
from django.core.validators import MinValueValidator


def migrar_fornecedores_string_para_modelo(apps, schema_editor):
    """
    Migra fornecedores que eram strings para o modelo Fornecedor
    """
    Lote = apps.get_model('core', 'Lote')
    Fornecedor = apps.get_model('core', 'Fornecedor')

    # Pega todos os nomes únicos de fornecedores existentes (não vazios)
    fornecedores_strings = Lote.objects.exclude(
        fornecedor_temp=''
    ).values_list('fornecedor_temp', flat=True).distinct()

    # Cria um Fornecedor para cada nome único
    fornecedores_criados = {}
    for nome in fornecedores_strings:
        if nome and nome.strip():
            fornecedor, created = Fornecedor.objects.get_or_create(
                nome=nome.strip(),
                defaults={
                    'ativo': True,
                }
            )
            fornecedores_criados[nome] = fornecedor

    # Associa os lotes aos fornecedores criados
    for lote in Lote.objects.exclude(fornecedor_temp=''):
        nome_fornecedor = lote.fornecedor_temp
        if nome_fornecedor and nome_fornecedor in fornecedores_criados:
            lote.fornecedor = fornecedores_criados[nome_fornecedor]
            lote.save(update_fields=['fornecedor'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_adiciona_lote_em_alertas'),
    ]

    operations = [
        # Passo 1: Criar modelo Fornecedor
        migrations.CreateModel(
            name='Fornecedor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=200, verbose_name='Nome/Razão Social')),
                ('nome_fantasia', models.CharField(blank=True, max_length=200, verbose_name='Nome Fantasia')),
                ('cnpj', models.CharField(blank=True, max_length=18, null=True, unique=True, verbose_name='CNPJ')),
                ('telefone', models.CharField(blank=True, max_length=20, verbose_name='Telefone')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='Email')),
                ('endereco', models.TextField(blank=True, verbose_name='Endereço')),
                ('observacoes', models.TextField(blank=True, verbose_name='Observações')),
                ('ativo', models.BooleanField(default=True, verbose_name='Ativo')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
            ],
            options={
                'verbose_name': 'Fornecedor',
                'verbose_name_plural': 'Fornecedores',
                'ordering': ['nome'],
                'indexes': [
                    models.Index(fields=['ativo'], name='core_fornec_ativo_idx'),
                    models.Index(fields=['nome'], name='core_fornec_nome_idx'),
                ],
            },
        ),

        # Passo 2: Renomear campo antigo temporariamente
        migrations.RenameField(
            model_name='lote',
            old_name='fornecedor',
            new_name='fornecedor_temp',
        ),

        # Passo 3: Adicionar novo campo FK (null por enquanto)
        migrations.AddField(
            model_name='lote',
            name='fornecedor',
            field=models.ForeignKey(
                blank=True,
                help_text='Fornecedor deste lote',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='lotes',
                to='core.fornecedor',
                verbose_name='Fornecedor'
            ),
        ),

        # Passo 4: Migrar dados (strings -> FKs)
        migrations.RunPython(
            migrar_fornecedores_string_para_modelo,
            reverse_code=migrations.RunPython.noop
        ),

        # Passo 5: Remover campo temporário
        migrations.RemoveField(
            model_name='lote',
            name='fornecedor_temp',
        ),
    ]
