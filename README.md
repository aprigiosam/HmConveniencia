# Comércio Pro

Plataforma para gestão de comércio de bairro com PDV, estoque, fornecedores, relatórios e emissão simulada de NF-e (São Paulo).

## Requisitos

- Docker e Docker Compose
- Node.js 18+ (para builds locais do frontend)
- Python 3.12+ (opcional, caso queira rodar backend fora do Docker)

## Como rodar o projeto

### 1. Ambiente via Docker (recomendado)

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

### 2. Backend local (sem Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Defina as variáveis no `.env` (exemplo em `.env.example` se existir) apontando para seu Postgres/Redis.

### 3. Frontend local

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

## Fluxos chave

### PDV

1. Login (`/login`) com usuário staff.
2. Acesse `/pdv`, busque produtos por SKU/código de barras (Ctrl+Enter adiciona).
3. Informe pagamentos (dinheiro/cartão/pix) e finalize.
   - *Importante*: atualmente o PDV grava localmente; para registrar no backend, utilize a API `/sales/vendas/` ou adapte o fluxo conforme a necessidade.

### Estoque

- Cadastrar produtos e lotes em **Produtos/Estoque**.
- Ajustes e movimentações via endpoints de `apps/inventory` ou scripts.

### NF-e

- Cadastre a configuração em **NF-e** (loja, certificado A1 em base64, CSC).
- Emissão atual é simulada (`simular_autorizacao`); o payload gera chave e protocolo mock.
- Para integrar com SEFAZ/SP, substituir o serviço de simulação pelas chamadas reais.

## Scripts úteis

- `make dev` – roda `docker compose up` com logs
- `make lint` / `make test` – personalize conforme setup de linters/tests

## Próximos passos sugeridos

- Substituir o simulador de NF-e por comunicação real com SEFAZ (biblioteca ex: [specNFe Python](https://github.com/akretion/pysped-nfe)).
- Implementar testes automatizados (backend/frontend).
- Integrar PDV diretamente com API de vendas (estoque já pronto no backend).

## Licença

Uso interno da Hm Conveniência.
