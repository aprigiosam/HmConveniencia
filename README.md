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

1. Crie conta no [Render](https://render.com)
2. Conecte seu repositório GitHub
3. Siga as instruções em `DEPLOY.md`

## 📊 Banco de Dados

- **Dev**: SQLite (automático)
- **Prod**: PostgreSQL no Render (1GB grátis)

## 🔐 Credenciais padrão (dev)

- Usuário: `admin`
- Senha: `admin123`

## 📝 Licença

Uso livre para HMConveniencia.
