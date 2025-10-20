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
   - Nome: `hmconveniencia-api`
   - URL: https://hmconveniencia-api.onrender.com
   - Branch: `main`
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && gunicorn hmconveniencia.wsgi:application --bind 0.0.0.0:$PORT`
   - Variáveis de ambiente:
     - `DATABASE_URL` (PostgreSQL)
     - `SECRET_KEY`
     - `DEBUG=False`
     - `ALLOWED_HOSTS=hmconveniencia-api.onrender.com,hmconveniencia.onrender.com`
     - `CORS_ALLOWED_ORIGINS=https://hmconveniencia.onrender.com`

2. **Static Site (Frontend)**
   - Nome: `hmconveniencia`
   - URL: https://hmconveniencia.onrender.com
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

### Sprint 3 (Concluída)
- ✅ **Controle de validade de produtos**
  - Campo opcional data_validade no cadastro de produtos
  - Badges visuais: vermelho (vencido), amarelo (≤7 dias), verde (>7 dias)
  - Dashboard com cards de produtos vencidos e próximos ao vencimento
  - Cálculo de lucro diário no dashboard
- ✅ **Cálculo de troco no PDV**
  - Campo "Valor Recebido" para pagamentos em dinheiro
  - Exibição automática do troco em destaque verde
  - Validação que impede finalizar com valor insuficiente
  - Limpeza automática ao trocar forma de pagamento

### Sprint 4 (Concluída)
- ✅ **PWA (Progressive Web App) Completo**
  - Manifest.json configurado com nome, ícones e atalhos
  - Service Worker com cache estratégico
  - Instalável na tela inicial do celular (Android/iOS)
  - Funciona em tela cheia (sem barra do navegador)
  - Cache de app shell para carregamento instantâneo
  - Network-first para API com fallback para cache
  - Stale-while-revalidate para assets estáticos
  - Sincronização em background
  - Auto-atualização a cada 1 minuto

### Sprint 5 (Concluída)
- ✅ **Sistema de Alertas Inteligentes**
  - 7 tipos de alertas proativos:
    - 💳 Limite de crédito (>80% do limite)
    - 📅 Produtos vencendo (próximos 3 dias)
    - ❌ Produtos vencidos
    - 📦 Estoque baixo (<10 unidades)
    - 🚫 Estoque zerado
    - 💰 Contas vencidas (>7 dias de atraso)
    - 💵 Diferença de caixa (>R$ 50)
  - 4 níveis de prioridade (Crítico, Alto, Médio, Baixo)
  - Backend: Model, Service Layer, Management Command, API
  - Frontend: Página completa com dashboard e ações
  - Comando: `python manage.py check_alerts`

### Módulos Principais

#### 1. PDV (Ponto de Venda)
- Busca de produtos por nome ou código de barras
- Scanner de código de barras via câmera
- Carrinho de compras com validação de estoque
- Múltiplas formas de pagamento (Dinheiro, Débito, Crédito, PIX, Fiado)
- **Cálculo automático de troco** para pagamentos em dinheiro
- Vendas fiado com cliente e data de vencimento
- Funcionamento offline com sincronização automática

#### 2. Produtos
- Cadastro com nome, preço, estoque, categoria, código de barras e **data de validade**
- Scanner de código de barras para cadastro
- **Alertas visuais** de produtos vencidos ou próximos ao vencimento
- Listagem com filtros e indicadores de validade
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
- **Lucro do dia** (margem bruta)
- Total em caixa
- Contas a receber pendentes (com destaque para vencidas)
- Estoque baixo (≤ 5 unidades)
- **Produtos vencidos** (alerta vermelho)
- **Produtos próximos ao vencimento** (≤ 7 dias, alerta amarelo)

#### 6. Alertas (Novo!)
- **Dashboard de resumo** com estatísticas em tempo real
- **Tabs por prioridade**: Críticos, Altos, Médios, Baixos
- **Cards de alertas** com informações contextuais
- **Ações rápidas**: Marcar lido, Resolver, Verificar novos
- **Integração completa** com backend via API REST
- **Interface moderna** com Mantine UI e React Icons

## Configuração da API

### Base URL
Produção: `https://hmconveniencia-api.onrender.com/api/`

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

### PWA (Progressive Web App)
- **Manifest:** `/public/manifest.json` com nome, ícones, shortcuts
- **Service Worker:** `/public/sw.js` registrado em `App.jsx`
- **Estratégias de Cache:**
  - App Shell: Pre-cache de arquivos essenciais (index.html, manifest, logo)
  - API: Network-first com fallback para cache offline
  - Assets: Stale-while-revalidate (retorna cache + atualiza em background)
- **Instalação:** Botão "Adicionar à tela inicial" em Android/iOS
- **Atualizações:** Verificação automática a cada 1 minuto
- **Background Sync:** Sincronização de vendas quando volta online

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
   - Backend: https://hmconveniencia-api.onrender.com/api/health/
   - Frontend: https://hmconveniencia.onrender.com

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

### Sprint 5 (Sugestões)
- [ ] **Múltiplas unidades de embalagem** (caixa/fardo vs unidade)
- [ ] Relatórios de vendas por período com gráficos
- [ ] Impressão de cupom fiscal/comprovante
- [ ] Backup/export de dados (CSV/Excel)
- [ ] Controle de fornecedores
- [ ] Notas fiscais de entrada
- [ ] Multi-usuários com permissões
- [ ] Controle de troco no caixa (alertas)
- [ ] Gerar ícones PWA otimizados (192x192, 512x512)

### Otimizações Futuras
- [ ] Compressão de imagens de produtos
- [ ] Notificações push (via PWA)
- [ ] Testes E2E (Playwright/Cypress)
- [ ] Performance: Code splitting avançado

## Informações de Contato

**Repositório GitHub:** https://github.com/aprigiosam/HmConveniencia
**Deploy Frontend:** https://hmconveniencia.onrender.com
**API Backend:** https://hmconveniencia-api.onrender.com/api/

---

**Última atualização:** 2025-10-18
**Sprint atual:** Sprint 4 Concluída ✅ (PWA Implementado)
**Versão:** 1.3.0
