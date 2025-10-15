#!/bin/bash
# Setup script para HMConveniencia PDV

echo "🚀 Configurando HMConveniencia PDV..."

# Backend
echo "📦 Configurando backend..."
cd backend

# Cria venv se não existir
if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual..."
    python3 -m venv venv
fi

# Ativa venv
source venv/bin/activate

# Instala dependências
echo "Instalando dependências..."
pip install --upgrade pip
pip install -r requirements.txt

# Cria .env se não existir
if [ ! -f ".env" ]; then
    echo "Criando arquivo .env..."
    cp .env.example .env
    echo "SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')" >> .env
fi

# Migrations
echo "Rodando migrations..."
python manage.py makemigrations
python manage.py migrate

# Cria superusuário
echo "Criando superusuário admin/admin123..."
python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@hmconv.com', 'admin123')
    print('Superusuário criado!')
else:
    print('Superusuário já existe')
EOF

# Popula banco com dados de teste
echo "Criando produtos de exemplo..."
python manage.py shell << EOF
from core.models import Produto
from decimal import Decimal

produtos_exemplo = [
    {'nome': 'Coca-Cola 2L', 'preco': Decimal('8.50'), 'estoque': Decimal('50'), 'codigo_barras': '7894900011517'},
    {'nome': 'Pão Francês (kg)', 'preco': Decimal('12.00'), 'estoque': Decimal('20'), 'codigo_barras': ''},
    {'nome': 'Leite Integral 1L', 'preco': Decimal('5.50'), 'estoque': Decimal('30'), 'codigo_barras': '7891000100103'},
    {'nome': 'Arroz 5kg', 'preco': Decimal('25.90'), 'estoque': Decimal('15'), 'codigo_barras': '7896004700014'},
    {'nome': 'Feijão 1kg', 'preco': Decimal('8.90'), 'estoque': Decimal('25'), 'codigo_barras': '7896004700021'},
]

for prod_data in produtos_exemplo:
    if not Produto.objects.filter(nome=prod_data['nome']).exists():
        Produto.objects.create(**prod_data)
        print(f"✓ {prod_data['nome']}")

print(f"Total de produtos: {Produto.objects.count()}")
EOF

cd ..

echo ""
echo "✅ Backend configurado com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "1. cd backend"
echo "2. source venv/bin/activate"
echo "3. python manage.py runserver"
echo ""
echo "🔐 Credenciais de acesso:"
echo "   Usuário: admin"
echo "   Senha: admin123"
echo ""
echo "🌐 URLs:"
echo "   Admin: http://localhost:8000/admin"
echo "   API: http://localhost:8000/api/"
