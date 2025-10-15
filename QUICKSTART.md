# 🚀 Guia Rápido - HMConveniencia PDV

## Configuração Inicial (5 minutos)

### Opção 1: Script Automático (Recomendado)
```bash
chmod +x setup.sh
./setup.sh
```

### Opção 2: Manual

#### 1. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

pip install -r requirements.txt
cp .env.example .env
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

#### 2. Frontend (novo terminal)
```bash
cd frontend
npm install
npm run dev
```

## Acessar o Sistema

- **Frontend**: http://localhost:5173
- **Admin Django**: http://localhost:8000/admin
- **API**: http://localhost:8000/api/

## Credenciais Padrão

- **Usuário**: admin
- **Senha**: admin123

## Fluxo de Uso

### 1. Cadastrar Produtos
1. Acesse: **Produtos** → **+ Novo Produto**
2. Preencha: Nome, Preço, Estoque
3. Clique em **Criar**

### 2. Realizar Venda no PDV
1. Acesse: **PDV**
2. Digite o nome do produto na busca
3. Clique no produto para adicionar ao carrinho
4. Ajuste quantidade se necessário
5. Selecione forma de pagamento
6. Clique em **Finalizar Venda**

### 3. Ver Dashboard
1. Acesse: **Dashboard**
2. Veja: Total de vendas hoje, estoque baixo, últimas vendas

## Estrutura Simplificada

```
HmConveniencia/
├── backend/          # Django API
│   ├── core/        # Models: Produto, Venda
│   └── manage.py
├── frontend/        # React App
│   ├── src/
│   │   ├── pages/  # Dashboard, PDV, Produtos
│   │   └── services/ # API calls
│   └── package.json
├── setup.sh         # Script de instalação
├── DEPLOY.md        # Guia de deploy no Render
└── README.md        # Documentação completa
```

## Próximos Passos

- ✅ Cadastre produtos
- ✅ Teste vendas no PDV
- ✅ Verifique dashboard
- 📦 Deploy no Render (veja DEPLOY.md)
- 🔒 Mude senha do admin em produção

## Problemas Comuns

### Backend não inicia
```bash
# Certifique-se que o venv está ativado
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Reinstale dependências
pip install -r requirements.txt
```

### Frontend não conecta
```bash
# Verifique se backend está rodando em localhost:8000
# Verifique arquivo frontend/.env
cat frontend/.env
```

### Banco de dados vazio
```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
```

## Suporte

Consulte README.md para documentação completa.
