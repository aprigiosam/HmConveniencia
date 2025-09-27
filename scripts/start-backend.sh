#!/bin/bash

echo "🚀 Iniciando Sistema de Comércio Pro - Backend"

# Aguardar banco de dados
echo "⏳ Aguardando banco de dados..."
until pg_isready -h db -p 5432 -U comercio_user; do
  echo "⏳ Banco não está pronto ainda... aguardando..."
  sleep 2
done

echo "✅ Banco de dados conectado!"

# Executar migrações
echo "🔄 Executando migrações..."
python manage.py migrate

# Coletar arquivos estáticos
echo "📁 Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

# Criar superusuário se não existir
echo "👤 Verificando superusuário..."
python manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@comercio.com', 'admin123')
    print('✅ Superusuário criado: admin/admin123')
else:
    print('✅ Superusuário já existe')
"

# Carregar dados iniciais se necessário
echo "📊 Carregando dados iniciais..."
python manage.py shell -c "
from apps.core.models import Loja
if not Loja.objects.exists():
    print('📦 Carregando fixtures...')
    exec(open('scripts/load_initial_data.py').read())
else:
    print('✅ Dados iniciais já existem')
"

echo "🎉 Backend iniciado com sucesso!"

# Iniciar servidor
exec python manage.py runserver 0.0.0.0:8000
