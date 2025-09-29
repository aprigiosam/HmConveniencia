# Comércio Pro

Sistema completo para gestão de comércio de bairro com PDV integrado, controle de estoque, gestão de fornecedores, relatórios e emissão simulada de NF-e (São Paulo).

## Requisitos

- Docker e Docker Compose
- Node.js 18+ (para builds locais do frontend)
- Python 3.12+ (opcional, caso queira rodar backend fora do Docker)

## Como rodar o projeto

### 1. Ambiente via Docker para desenvolvimento

```bash
docker compose up --build -d
```

Serviços disponíveis:

- Backend Django: `http://localhost:8000`
- Frontend Vite/React: `http://localhost:3000`
- Postgres, Redis, Celery worker e scheduler sob demanda

Para encerrar:

```bash
docker compose down
```

### Acesso ao Sistema (desenvolvimento)

Após subir os containers de desenvolvimento, acesse:

- **Frontend**: http://localhost:3000
- **Credenciais padrão**:
  - Usuário: `admin`
  - Senha: `admin123`

### 2. Ambiente de Produção com Nginx (porta 8080)

Use o stack de produção quando for publicar a aplicação (Nginx como proxy, build otimizado do frontend e serviços protegidos):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Serviços publicados:

- Frontend + Nginx: `http://localhost:8080`
- API Django (via proxy): `http://localhost:8080/api/v1/`
- Backend interno: `http://localhost:8001`

> ✅ Configure `.env.prod` antes do primeiro deploy (senhas fortes, `ALLOWED_HOSTS`, `VITE_API_URL`, certificados, etc.). Veja `DEPLOY.md` para o passo a passo completo.

### 3. Backend local (sem Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Defina as variáveis no `.env` (exemplo em `.env.example` se existir) apontando para seu Postgres/Redis.

### 4. Frontend local

```bash
cd frontend
npm install
npm run dev
```

A aplicação usa Vite; configure `VITE_API_URL` no `.env` caso não use o padrão `http://localhost:8000/api/v1`.

## Estrutura principal

- `backend/` – Django 5 + DRF
  - `apps/catalog` – produtos, categorias, fornecedores
  - `apps/inventory` – controle de estoque e lotes
  - `apps/sales` – vendas e pagamentos
  - `apps/nfe` – emissão simulada de NF-e SP
  - `apps/reports` – métricas de dashboard e relatórios
- `frontend/` – React 18 + TypeScript + Zustand + Tailwind
  - `src/pages` – telas (Dashboard, POS, Produtos, Fornecedores, NF-e etc.)
  - `src/services` – chamadas REST centralizadas
  - `src/stores` – estados globais (auth, POS)

## Funcionalidades Principais

### 🛒 PDV (Ponto de Venda)

1. **Login** → Use `admin/admin123`
2. **Busca de produtos** → SKU/código de barras (Ctrl+Enter adiciona)
3. **Carrinho** → Adicione itens, ajuste quantidades e descontos
4. **Pagamentos** → 5 formas disponíveis (Dinheiro, Cartão, PIX, etc.)
5. **Finalização** → Sistema registra automaticamente no backend
6. **Comprovante** → Geração automática de recibo

### 📦 Gestão de Estoque

- **Produtos** → Cadastro completo via interface (categorias, fornecedores)
- **Entrada de estoque** → Modal para recebimento de mercadorias
- **Ajuste de estoque** → Correções e inventários via interface
- **Controle de lotes** → Gestão de validades e rastreabilidade
- **Alertas** → Notificações de vencimento e estoque baixo

### 🏢 Gestão de Fornecedores

- **Cadastro completo** → Dados, endereço, contatos
- **Vinculação** → Produtos associados aos fornecedores
- **Relatórios** → Análise de compras por fornecedor

### 📊 Relatórios e Dashboard

- **Dashboard em tempo real** → Vendas, estoque, alertas
- **Métricas** → Produtos mais vendidos, rentabilidade
- **Análises** → Relatórios de movimento e performance

### 📄 NF-e (Simulada - São Paulo)

- **Configuração** → Interface para setup (loja, certificado A1, CSC)
- **Emissão simulada** → Gera chave e protocolo mock para testes
- **Histórico** → Visualização de notas emitidas
- *Para produção*: substituir simulador por integração real SEFAZ/SP

## Comandos Úteis

```bash
# Subir sistema completo
make up

# Ver logs em tempo real
make logs

# Parar sistema
make down

# Backup do banco
make backup

# Resetar sistema (CUIDADO: apaga dados)
make reset

# Status dos containers
make status

# Backup do banco (dev)
make backup NAME=antes-de-alterar

# Restaurar backup (dev)
make restore BACKUP_FILE=dev_backup_20250929_120000.sql.gz

# Backup do banco (stack de produção local)
make backup-prod NAME=homolog
```

## Guia Rápido de Uso

### Para Usuários Finais

1. **Acesse (dev)**: http://localhost:3000 ou **Produção local**: http://localhost:8080
2. **Login**: admin / admin123
3. **Cadastre produtos**: Menu → Produtos → + Novo Produto
4. **Adicione estoque**: Menu → Estoque → + Entrada de Estoque
5. **Realize vendas**: Menu → PDV → busque produtos e finalize

### Para Desenvolvedores

- **API Documentation**: http://localhost:8000/api/docs
- **Django Admin**: http://localhost:8000/admin
- **Frontend dev**: `cd frontend && npm run dev`
- **Backend dev**: `cd backend && python manage.py runserver`

## Backups & Restauração

- Os dados do Postgres ficam no volume Docker, portanto mantenha backups periódicos antes de grandes mudanças.
- Com o ambiente _dev_ rodando, execute `make backup NAME=descricao` para gerar `backup/dev_backup_<timestamp>.sql.gz` (compactado).
- Para restaurar em desenvolvimento use `make restore BACKUP_FILE=nome_do_arquivo.sql.gz` (o comando aceita também arquivos `.sql`).
- Se estiver usando o stack de produção local (`docker-compose.prod.yml`), utilize `make backup-prod` e `make restore-prod` — ambos requerem um `.env.prod` configurado.
- Os arquivos são salvos em `./backup`; considere sincronizar essa pasta com um serviço externo (OneDrive, Google Drive etc.) para evitar perda de dados do notebook.
- Sugestão: crie uma tarefa agendada (Ex.: Agendador do Windows) que rode `make backup NAME=diario` para ter cópias automáticas antes das melhorias.

## Estado Atual do Sistema

✅ **Funcional e Pronto para Uso**
- PDV totalmente integrado
- Gestão completa de estoque via interface
- Todas as funcionalidades acessíveis pelo frontend
- Sistema preparado para usuários não-técnicos

## Próximos Passos (Opcionais)

- Integração real com SEFAZ/SP (substituir simulador NFe)
- Relatórios avançados de vendas
- Sistema de backup automatizado
- App mobile para PDV

## Licença

Uso interno / implantação controlada. Defina a política final de licenciamento antes de disponibilizar para terceiros.
