#!/usr/bin/env bash
# Script de build para Render.com
# Este script é executado automaticamente antes do deploy

set -o errexit  # Exit on error

echo "🔧 Instalando dependências..."
pip install -r backend/requirements.txt

echo "📦 Coletando arquivos estáticos..."
cd backend
python manage.py collectstatic --no-input

echo "🗄️  Executando migrations..."
python manage.py migrate --no-input

echo "✅ Build concluído com sucesso!"
