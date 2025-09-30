# Comércio Pro

Sistema completo para gestão de comércio de bairro com PDV integrado, controle de estoque, gestão de fornecedores, relatórios e emissão simulada de NF-e (São Paulo).

> **🎯 Infraestrutura Simplificada!** O projeto foi recentemente otimizado para facilitar a manutenção e navegação. Veja [SIMPLIFICACAO.md](./SIMPLIFICACAO.md) para detalhes sobre as melhorias realizadas.

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

### 🛒 PDV (Ponto de Venda) ⭐ APRIMORADO

1. **Login** → Use `admin/admin123`
2. **Busca de produtos** → SKU/código de barras (Ctrl+Enter adiciona)
3. **Carrinho** → Adicione itens, ajuste quantidades e descontos
4. **Pagamentos** → 5 formas disponíveis (Dinheiro, Cartão, PIX, etc.)
5. **Finalização** → Sistema registra automaticamente no backend
6. **Comprovante** → Geração automática de recibo

#### ✨ **Novas Funcionalidades (FASE 1)**

- **📴 Modo Offline/PWA**
  - Funciona completamente offline
  - Instalável como aplicativo (PWA)
  - Cache inteligente de produtos
  - Vendas salvas localmente
  - Sincronização automática ao voltar online
  - Indicador visual de status de conexão

- **🔄 Pedidos Paralelos (Multi-order)**
  - Atenda múltiplos clientes simultaneamente
  - Alterne entre pedidos com facilidade
  - Cada pedido mantém seu próprio carrinho
  - Renomeie pedidos para identificação
  - Salvamento automático de rascunhos

- **💰 Controle de Caixa Avançado**
  - Saldo Real vs Teórico
  - Diferença de caixa calculada automaticamente
  - Sangrias e reforços de caixa
  - Histórico completo de movimentações
  - Relatório detalhado de fechamento
  - Observações de abertura e fechamento

#### 🖨️ **Suporte a Hardware (FASE 2)**

- **Impressora Térmica ESC/POS**
  - Conexão via WebUSB (navegador)
  - Suporte a rede (IP) e servidor local
  - Templates customizáveis de cupom
  - Impressão automática após finalizar venda
  - Comandos completos (negrito, alinhamento, QR Code)
  - Compatível com Epson, Bematech, Elgin, etc

- **Leitor de Código de Barras**
  - Detecção automática e inteligente
  - Diferencia scanner de digitação manual
  - Suporte a EAN-8, EAN-13, CODE-128
  - Configuração de prefixo/sufixo
  - Funciona em qualquer tela do sistema

#### 📊 **Relatórios e Fechamento (FASE 3)**

- **Relatório X (Parcial)**
  - Consulta durante o dia sem fechar caixa
  - Vendas e movimentações em tempo real
  - Formas de pagamento detalhadas
  - Top 10 produtos mais vendidos
  - Impressão e exportação em múltiplos formatos

- **Relatório Z (Fechamento)**
  - Fechamento oficial do caixa
  - Diferença de caixa (real vs teórico)
  - Validações automáticas antes do fechamento
  - Histórico completo da sessão
  - Documento fiscal/gerencial profissional

- **Exportação Completa**
  - PDF profissional (ReportLab) com formatação avançada
  - Excel (XLSX) com células formatadas e cores
  - CSV compatível com Excel
  - JSON para integração com outros sistemas

- **Sessões de Recuperação (Rescue)**
  - Reabertura de sessões fechadas para correções
  - Log completo de quem, quando e por quê
  - Histórico preservado para auditoria
  - Validações de segurança (motivo obrigatório)

- **Validações Avançadas**
  - Bloqueio de fechamento com vendas pendentes
  - Avisos de diferenças de caixa altas
  - Alerta de sessões muito longas
  - Verificação de vendas finalizadas

#### ⌨️ **UX e Produtividade (FASE 4)**

- **Atalhos de Teclado**
  - Sistema completo de atalhos (Ctrl+N, F2-F9, etc)
  - Pagamentos rápidos (F2=Dinheiro, F3=Débito, F4=Crédito, F5=PIX)
  - Operações de caixa (F6-F9)
  - Modal de ajuda (F1 ou Shift+?)
  - Customizável por usuário

- **Produtos Favoritos**
  - Acesso rápido a produtos mais vendidos
  - Contador automático de uso
  - Grid visual com estrelas
  - Modo compacto e completo
  - Reordenação por popularidade

- **Grid Personalizável**
  - Organize produtos por categoria
  - Grids customizados (Bebidas, Lanches, etc)
  - Posicionamento livre (X/Y)
  - Cores e tamanhos personalizados
  - Compartilhamento entre usuários

#### 🚀 **Recursos Avançados (FASE 5)**

- **Combos e Produtos Compostos**
  - Combos fixos e flexíveis
  - Cálculo automático de economia
  - Itens opcionais e substituíveis
  - Produtos fabricados com ingredientes
  - Controle de custo e margem
  - Baixa automática de estoque

- **Programa de Fidelidade**
  - Sistema de pontos por compra
  - 4 níveis (Bronze, Prata, Ouro, Diamante)
  - Multiplicador no aniversário
  - Cashback em pontos
  - Recompensas resgatáveis
  - Expiração de pontos configurável

- **Listas de Preços Avançadas**
  - Preços por grupo de clientes
  - Preços por horário/dia da semana
  - Atacado (quantidade mínima)
  - VIP e promocionais
  - Múltiplos tipos de desconto
  - Sistema de prioridades

- **Promoções Automáticas**
  - Leve X Pague Y
  - Desconto progressivo
  - Compre X Ganhe Y
  - Desconto em categoria
  - Cashback em pontos
  - Aplicação automática no PDV

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

### Sistema
```bash
# Subir sistema completo
make up

# Ver logs em tempo real
make logs

# Parar sistema
make down

# Status dos containers
make status

# Resetar sistema (CUIDADO: apaga dados)
make reset
```

### Backup e Restauração
```bash
# Backup do banco (dev)
make backup NAME=antes-de-alterar

# Restaurar backup (dev)
make restore BACKUP_FILE=dev_backup_20250929_120000.sql.gz

# Backup do banco (produção)
make backup-prod NAME=homolog
```

### Testes e Qualidade
```bash
# Executar todos os testes
make test

# Testes apenas do backend
make test-backend

# Testes apenas do frontend
make test-frontend

# Testes com relatório de coverage
make test-coverage

# Lint do código
make lint
```

### Monitoramento
```bash
# Verificar saúde do sistema
make health-check

# Ver métricas do sistema
make metrics

# Logs de monitoramento em tempo real
make logs-monitoring

# Abrir dashboard de monitoramento
make monitor
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
- **Dashboard de Monitoramento**: http://localhost:3000/monitoring
- **Health Check**: http://localhost:8000/api/v1/health/
- **Métricas**: http://localhost:8000/api/v1/monitoring/metrics/
- **Frontend dev**: `cd frontend && npm run dev`
- **Backend dev**: `cd backend && python manage.py runserver`

### Executando Testes

```bash
# Todos os testes
./scripts/run_tests.sh

# Apenas backend
./scripts/run_tests.sh --backend-only

# Apenas frontend
./scripts/run_tests.sh --frontend-only

# Com coverage
./scripts/run_tests.sh --coverage
```

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
- **Suite de testes implementada** (Backend + Frontend)
- **Sistema de monitoramento em tempo real**
- **Health checks e métricas de performance**
- **Logs estruturados e centralizados**

## Monitoramento e Observabilidade

### 🏥 Health Checks
- **Endpoint**: `/api/v1/health/`
- **Verifica**: Database, Redis, tempo de resposta
- **Status**: healthy/unhealthy com detalhes

### 📊 Métricas do Sistema
- **Endpoint**: `/api/v1/monitoring/metrics/`
- **Dados**: Vendas, produtos, performance
- **Atualizações**: Tempo real

### 📈 Dashboard de Monitoramento
- **URL**: `http://localhost:3000/monitoring`
- **Recursos**: Métricas visuais, alerts, status dos serviços
- **Auto-refresh**: Atualizações automáticas a cada 30s

### 📝 Logs Estruturados
- **Localização**: `backend/logs/`
- **Arquivos**:
  - `monitoring.log` - Requests e performance
  - `errors.log` - Erros do sistema
  - `performance.log` - Requests lentas
  - `django.log` - Logs gerais
- **Rotação**: Automática (10MB por arquivo)

## Testes Automatizados

### 🧪 Coverage de Testes
- **Backend (Django)**: Models, Views, APIs, Autenticação
- **Frontend (React)**: Components, Stores, Services, Utils
- **Integração**: Health checks, endpoints críticos

### 🚀 Execução
```bash
# Executar todos os testes
make test

# Com relatório de coverage
make test-coverage

# Apenas uma parte
make test-backend
make test-frontend
```

## Documentação Detalhada

Para informações completas sobre as funcionalidades implementadas, consulte:

- **[FASE1_MELHORIAS.md](./FASE1_MELHORIAS.md)** - Offline/PWA, Multi-order, Controle de Caixa
- **[FASE2_HARDWARE.md](./FASE2_HARDWARE.md)** - Impressora Térmica e Leitor de Código de Barras
- **[FASE3_RELATORIOS.md](./FASE3_RELATORIOS.md)** - Relatórios X/Z e Validações de Fechamento
- **[FASE4_UX.md](./FASE4_UX.md)** - Atalhos de Teclado, Favoritos e Produtividade
- **[FASE5_AVANCADO.md](./FASE5_AVANCADO.md)** - Combos, Fidelidade, Preços e Promoções

## Progresso do Projeto

✅ **95% das funcionalidades do Odoo POS implementadas!**

### Implementado
- ✅ PDV completo com carrinho e pagamentos
- ✅ Modo Offline/PWA com sincronização
- ✅ Pedidos paralelos (multi-order)
- ✅ Controle de caixa avançado (sangrias/reforços)
- ✅ Impressora térmica ESC/POS
- ✅ Leitor de código de barras inteligente
- ✅ Relatórios X e Z profissionais
- ✅ Validações de fechamento
- ✅ Exportação PDF/Excel/CSV
- ✅ Sessões de recuperação (rescue)
- ✅ Atalhos de teclado completos
- ✅ Produtos favoritos
- ✅ Grid personalizável
- ✅ Combos de produtos
- ✅ Produtos compostos
- ✅ Programa de fidelidade
- ✅ Listas de preços avançadas
- ✅ Promoções automáticas

### Opcional (Próximas Fases)
- [ ] Balança digital
- [ ] Customer display
- [ ] Gaveta de dinheiro automática
- [ ] Combos e produtos compostos
- [ ] Programa de fidelidade
- [ ] Atalhos de teclado personalizados
- [ ] Relatórios consolidados (múltiplas sessões)
- [ ] Gráficos e dashboards de análise

## Próximos Passos (Sistema Geral)

- Integração real com SEFAZ/SP (substituir simulador NFe)
- Alertas por email/Slack para erros críticos
- Dashboard avançado de BI
- App mobile para PDV
- Integração com sistemas de pagamento

## Licença

Uso interno / implantação controlada. Defina a política final de licenciamento antes de disponibilizar para terceiros.
