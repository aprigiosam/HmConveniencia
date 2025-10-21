#!/usr/bin/env bash
# Script de build para Render.com

set -o errexit

echo "🔧 Build iniciado..."
pip install -r backend/requirements.txt
cd backend
python manage.py collectstatic --no-input
python manage.py migrate --no-input
echo "✅ Build OK!"
