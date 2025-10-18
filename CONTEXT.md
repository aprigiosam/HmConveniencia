# HM Conveniência - Contexto do Projeto

## Visão Geral
Sistema de gestão para conveniências/mercadinhos com funcionalidades de PDV, controle de estoque, caixa, contas a receber e relatórios.

## Arquitetura

### Stack Tecnológico
**Backend:**
- Django 5.0
- Django REST Framework 3.14.0
- PostgreSQL (banco de dados)
- Gunicorn (servidor WSGI)
- WhiteNoise (servir arquivos estáticos)
- Django CORS Headers
- Django Rate Limit (proteção de APIs)

**Frontend:**
- React 18.2.0
- Vite 5.0 (bundler)
- Mantine UI 8.3.5 (biblioteca de componentes)
- Axios (requisições HTTP)
- React Router DOM 6.20
- React Icons
- @zxing/browser (leitor de código de barras)
- IndexedDB (cache local offline-first)

### Hospedagem (Render.com)
**Serviços ativos:**
1. **Web Service (API Backend)**
   - Nome: `hmconveniencia`
   - URL: https://hmconveniencia.onrender.com
   - Branch: `main`
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT`
   - Variáveis de ambiente:
     - `DATABASE_URL` (PostgreSQL)
     - `SECRET_KEY`
     - `DEBUG=False`
     - `ALLOWED_HOSTS=hmconveniencia.onrender.com,hmconveniencia-frontend.onrender.com`

2. **Static Site (Frontend)**
   - Nome: `hmconveniencia-frontend`
   - URL: https://hmconveniencia-frontend.onrender.com
   - Branch: `main`
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`

3. **PostgreSQL Database**
   - Nome: `hmconveniencia-db`
   - Conectado ao Web Service via `DATABASE_URL`

### Estrutura de Diretórios
```
HmConveniencia/
├── backend/
│   ├── core/                 # Configurações Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── views.py         # ViewSets da API
│   │   ├── models.py        # Modelos do banco
│   │   └── serializers.py   # Serializadores DRF
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # Páginas React
│   │   │   ├── PDV.jsx      # Ponto de Venda
│   │   │   ├── Produtos.jsx
│   │   │   ├── Categorias.jsx
│   │   │   ├── Clientes.jsx
│   │   │   ├── Caixa.jsx
│   │   │   ├── HistoricoCaixa.jsx
│   │   │   ├── ContasReceber.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Login.jsx
│   │   ├── services/
│   │   │   └── api.js       # Axios client + endpoints
│   │   ├── utils/
│   │   │   ├── db.js        # IndexedDB (cache offline)
│   │   │   └── syncManager.js # Sincronização offline
│   │   ├── components/
│   │   │   └── SyncStatus.jsx
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── CONTEXT.md              # Este arquivo
└── README.md
```

## Funcionalidades Implementadas

### Sprint 1 (Concluída)
- ✅ Health check endpoint (`/health/`)
- ✅ Paginação otimizada (PageNumberPagination, 50 itens/página)
- ✅ Autenticação básica
- ✅ CRUD completo de Produtos, Categorias, Clientes

### Sprint 2 (Concluída)
- ✅ Rate limiting (10 requisições/minuto por IP)
- ✅ Cache offline com IndexedDB (cache-first strategy)
- ✅ Sincronização automática de vendas offline
- ✅ **Leitor de código de barras via câmera do celular**
  - Implementado com @zxing/browser
  - Funciona no PDV (adicionar produtos ao carrinho)
  - Funciona no cadastro de Produtos (preencher código)
  - Detecção automática + fechamento de modal
  - Proteção contra leituras duplicadas

### Módulos Principais

#### 1. PDV (Ponto de Venda)
- Busca de produtos por nome ou código de barras
- Scanner de código de barras via câmera
- Carrinho de compras com validação de estoque
- Múltiplas formas de pagamento (Dinheiro, Débito, Crédito, PIX, Fiado)
- Vendas fiado com cliente e data de vencimento
- Funcionamento offline com sincronização automática

#### 2. Produtos
- Cadastro com nome, preço, estoque, categoria e código de barras
- Scanner de código de barras para cadastro
- Listagem com filtros
- Edição e exclusão
- Cache local para performance

#### 3. Caixa
- Abertura/fechamento de caixa
- Movimentações (sangria/suprimento)
- Controle de saldo
- Histórico de movimentações

#### 4. Contas a Receber
- Vendas fiadas pendentes
- Registro de pagamentos parciais/totais
- Filtros por status
- Cálculo automático de saldo devedor

#### 5. Dashboard
- Resumo de vendas do dia
- Total em caixa
- Contas a receber pendentes
- Estoque baixo (≤ 5 unidades)

## Configuração da API

### Base URL
Produção: `https://hmconveniencia.onrender.com/api/`

### Principais Endpoints
```
GET    /api/produtos/          # Listar produtos (paginado)
POST   /api/produtos/          # Criar produto
PUT    /api/produtos/{id}/     # Atualizar produto
DELETE /api/produtos/{id}/     # Deletar produto

GET    /api/categorias/        # Listar categorias
POST   /api/categorias/        # Criar categoria

GET    /api/clientes/          # Listar clientes
POST   /api/clientes/          # Criar cliente

POST   /api/vendas/            # Criar venda
GET    /api/vendas/            # Listar vendas

GET    /api/caixa/             # Status do caixa
POST   /api/caixa/abrir/       # Abrir caixa
POST   /api/caixa/fechar/      # Fechar caixa
POST   /api/movimentacoes/     # Criar movimentação

GET    /api/contas-receber/    # Listar contas a receber
POST   /api/contas-receber/{id}/pagar/ # Registrar pagamento

GET    /health/                # Health check
```

## Estratégias Importantes

### Cache Offline (IndexedDB)
- **Cache-first**: Carrega do cache imediatamente, sincroniza em background
- Usado em: PDV, Produtos, Categorias, Clientes
- Banco: `hmconveniencia_db`
- Stores: `produtos`, `categorias`, `clientes`, `vendas_pendentes`

### Scanner de Código de Barras
- Biblioteca: @zxing/browser (BrowserMultiFormatReader)
- Formatos suportados: EAN-13, EAN-8, UPC-A, UPC-E, Code 39, Code 93, Code 128, ITF, Codabar
- Proteção contra leituras duplicadas via `leituraEmAndamentoRef`
- Cleanup seguro: seta `scannerRef.current = null` ANTES de parar scanner
- IDs de vídeo: `video-reader` (PDV), `video-reader-produtos` (Produtos)

### Sincronização Offline
- Vendas ficam em `vendas_pendentes` no IndexedDB
- `syncManager.syncAll()` tenta enviar ao servidor periodicamente
- Notificações informam se venda foi online ou offline
- Retry automático quando conexão retornar

## Deploy

### Como fazer deploy manual
1. **Commit e push para o GitHub:**
   ```bash
   git add .
   git commit -m "feat: sua mensagem"
   git push
   ```

2. **Render faz deploy automático:**
   - Backend: 2-3 minutos (instala deps + reinicia servidor)
   - Frontend: 3-5 minutos (npm install + build + deploy estático)

3. **Verificar deploy:**
   - Backend: https://hmconveniencia.onrender.com/health/
   - Frontend: https://hmconveniencia-frontend.onrender.com

### Comandos úteis de desenvolvimento

**Backend (local):**
```bash
cd backend
python manage.py runserver
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py shell
pytest  # testes
```

**Frontend (local):**
```bash
cd frontend
npm run dev          # servidor desenvolvimento (porta 5173)
npm run build        # build produção
npm run preview      # preview do build
npm test             # testes (vitest)
```

## Problemas Conhecidos e Soluções

### Scanner de Código de Barras
- **Problema:** Modal não fecha após leitura
- **Solução:** Setar `scannerRef.current = null` ANTES de parar o scanner
- **Problema:** Notificações em loop
- **Solução:** Proteção dupla: `if (leituraEmAndamentoRef.current || !scannerRef.current) return;`

### Render Free Tier
- **Problema:** Servidor "dorme" após 15 minutos de inatividade
- **Impacto:** Primeira requisição pode levar 30-60 segundos
- **Solução:** Health check endpoint + cache offline no frontend

### CORS
- Já configurado no backend com `django-cors-headers`
- Permite origem: `hmconveniencia-frontend.onrender.com`

## Próximas Melhorias Sugeridas

### Sprint 3 (Sugestões)
- [ ] Relatórios de vendas por período
- [ ] Gráficos no Dashboard (Chart.js ou Recharts)
- [ ] Impressão de cupom fiscal
- [ ] Backup/export de dados (CSV/Excel)
- [ ] Notificações push para estoque baixo
- [ ] Multi-usuários com permissões
- [ ] Controle de validade de produtos

### Otimizações Futuras
- [ ] Service Worker para PWA completo
- [ ] Compressão de imagens de produtos
- [ ] Lazy loading de rotas
- [ ] Testes E2E (Playwright/Cypress)

## Informações de Contato

**Repositório GitHub:** (adicionar URL se tiver)
**Deploy Frontend:** https://hmconveniencia-frontend.onrender.com
**API Backend:** https://hmconveniencia.onrender.com/api/

---

**Última atualização:** 2025-10-18
**Sprint atual:** Sprint 2 Concluída ✅
**Versão:** 1.0.0
