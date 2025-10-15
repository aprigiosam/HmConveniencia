# HMConveniencia - PDV Simples

Sistema de Ponto de Venda simples e eficiente para comércio de bairro.

## 🎯 Funcionalidades

- ✅ Cadastro rápido de produtos (nome + preço)
- ✅ PDV para realizar vendas
- ✅ Controle básico de estoque
- ✅ Histórico de vendas
- ✅ Dashboard com totais do dia

## 🚀 Stack Tecnológica

- **Backend**: Django 5 + Django REST Framework
- **Frontend**: React 18 + Vite
- **Banco**: PostgreSQL
- **Deploy**: Render (gratuito)

## 📦 Estrutura

```
HmConveniencia/
├── backend/          # API Django
├── frontend/         # React App
└── README.md
```

## 🔧 Desenvolvimento Local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:5173

## 🌐 Deploy no Render (Gratuito)

### Backend (Web Service)
1. Crie um **Web Service** no Render
2. Conecte ao repositório GitHub
3. Configure:
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && gunicorn hmconveniencia.wsgi:application`
   - **Root Directory**: deixe em branco
4. Adicione as variáveis de ambiente:
   - `DATABASE_URL`: (automático do Render PostgreSQL)
   - `SECRET_KEY`: gere uma chave segura
   - `ALLOWED_HOSTS`: `seu-app.onrender.com`
   - `DEBUG`: `False`

### Frontend (Static Site)
1. Crie um **Static Site** no Render
2. Conecte ao mesmo repositório GitHub
3. Configure:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Root Directory**: deixe em branco
4. **IMPORTANTE**: Adicione a variável de ambiente:
   - `VITE_API_URL`: `https://seu-backend.onrender.com/api`

> ⚠️ **Atenção**: O frontend PRECISA da variável `VITE_API_URL` configurada no Render apontando para a URL do backend, caso contrário o sistema não conseguirá se comunicar com a API.

## 📊 Banco de Dados

- **Dev**: SQLite (automático)
- **Prod**: PostgreSQL no Render (1GB grátis)

## 🔐 Credenciais padrão (dev)

- Usuário: `admin`
- Senha: `admin123`

## 📝 Licença

Uso livre para HMConveniencia.
