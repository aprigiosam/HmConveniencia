#!/usr/bin/env python
"""
Cria superusuário automaticamente se não existir
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hmconveniencia.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@hmconv.com', 'admin123')
    print('✓ Superusuário criado: admin/admin123')
else:
    print('✓ Superusuário já existe')
