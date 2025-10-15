# Deploy no Render (Gratuito)

Este guia mostra como fazer deploy do HMConveniencia no Render gratuitamente.

## Pré-requisitos

1. Conta no [Render](https://render.com) (gratuito)
2. Conta no [GitHub](https://github.com)
3. Código no GitHub

## Passo 1: Preparar o Repositório

1. Faça commit de todo o código:
```bash
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

## Passo 2: Criar Banco PostgreSQL no Render

1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Clique em **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `hmconveniencia-db`
   - **Database**: `hmconveniencia`
   - **User**: `hmconv_user`
   - **Region**: escolha a mais próxima
   - **Plan**: **Free**
4. Clique em **"Create Database"**
5. **Copie o "Internal Database URL"** (vamos usar depois)

## Passo 3: Criar Web Service (Backend)

1. Clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: `hmconveniencia-api`
   - **Region**: mesma do banco
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - **Start Command**: `gunicorn hmconveniencia.wsgi:application --bind 0.0.0.0:$PORT`
   - **Plan**: **Free**

4. **Environment Variables** (clique em "Advanced"):
   ```
   SECRET_KEY=<gere uma chave aleatória>
   DEBUG=False
   ALLOWED_HOSTS=hmconveniencia-api.onrender.com
   DATABASE_URL=<cole o Internal Database URL do passo 2>
   CORS_ALLOWED_ORIGINS=https://hmconveniencia.onrender.com
   ```

   Para gerar SECRET_KEY:
   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

5. Clique em **"Create Web Service"**

## Passo 4: Criar Static Site (Frontend)

1. Clique em **"New +"** → **"Static Site"**
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: `hmconveniencia`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_URL=https://hmconveniencia-api.onrender.com/api
   ```

5. Clique em **"Create Static Site"**

## Passo 5: Criar Superusuário

Após o backend estar no ar:

1. Acesse o Shell do backend no Render
2. Execute:
```python
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.create_superuser('admin', 'admin@hmconv.com', 'SenhaSegura123!')
```

## Passo 6: Popular com Dados Iniciais (Opcional)

No shell do backend:
```python
from core.models import Produto
from decimal import Decimal

produtos = [
    {'nome': 'Coca-Cola 2L', 'preco': Decimal('8.50'), 'estoque': Decimal('50')},
    {'nome': 'Pão Francês (kg)', 'preco': Decimal('12.00'), 'estoque': Decimal('20')},
    {'nome': 'Leite 1L', 'preco': Decimal('5.50'), 'estoque': Decimal('30')},
]

for p in produtos:
    Produto.objects.create(**p)
```

## Acessar o Sistema

- **Frontend**: https://hmconveniencia.onrender.com
- **Admin**: https://hmconveniencia-api.onrender.com/admin
- **API**: https://hmconveniencia-api.onrender.com/api/

## Limitações do Plano Gratuito

- ⚠️ **Backend dorme após 15min de inatividade** (primeira requisição pode demorar ~30s)
- ⚠️ **750 horas/mês** (suficiente para 1 serviço 24/7)
- ⚠️ **Banco PostgreSQL: 1GB**
- ✅ **SSL/HTTPS automático**
- ✅ **Deploys automáticos via Git**

## Dicas

- Para produção real, considere planos pagos (a partir de $7/mês)
- Faça backups regulares do banco
- Configure domínio personalizado (gratuito)
- Monitore uso no dashboard do Render

## Troubleshooting

### Backend não inicia
- Verifique logs no Render Dashboard
- Confira se todas as variáveis de ambiente estão corretas
- Verifique se DATABASE_URL está correto

### Frontend não conecta no backend
- Confira VITE_API_URL no frontend
- Confira CORS_ALLOWED_ORIGINS no backend
- Verifique se o backend está no ar

### Banco de dados vazio
- Execute as migrations manualmente no Shell
- Crie o superusuário via Shell
- Popule produtos iniciais

## Suporte

Em caso de problemas, consulte:
- [Render Docs](https://render.com/docs)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/)
