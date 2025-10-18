# Melhorias Sugeridas - HM Conveniência PDV

**Data:** 2025-10-17
**Status Atual:** ✅ Sistema funcionando em produção

---

## 🔴 PRIORIDADE ALTA (Segurança e Crítico)

### 1. Corrigir Vulnerabilidades do npm
**Status:** ⚠️ Pendente
**Complexidade:** Baixa (5min)

```bash
cd frontend
npm audit fix
```

**Impacto:** 2 vulnerabilidades moderadas detectadas

---

### 2. Adicionar Validação de Data Mínima (FIADO)
**Status:** ⚠️ Pendente
**Complexidade:** Baixa (10min)

**Problema:** Data de vencimento pode ser no passado
**Solução:** Validar que data >= hoje

**Arquivos a modificar:**
- `frontend/src/pages/PDV.jsx` - Adicionar `minDate={new Date()}`
- `backend/core/serializers.py` - Validar data >= hoje

```python
# Backend
from datetime import date

if data.get('data_vencimento') and data['data_vencimento'] < date.today():
    raise serializers.ValidationError({
        'data_vencimento': 'Data de vencimento não pode ser no passado'
    })
```

---

### 3. Adicionar Rate Limiting na API
**Status:** ⚠️ Pendente
**Complexidade:** Média (30min)

**Problema:** API sem proteção contra abuso
**Solução:** django-ratelimit

```bash
pip install django-ratelimit
```

**Endpoints prioritários:**
- `/api/auth/login/` - 5 tentativas/minuto
- `/api/vendas/` - 30 vendas/minuto

---

## 🟡 PRIORIDADE MÉDIA (UX e Performance)

### 4. Substituir `alert()` por Toasts/Notificações
**Status:** ⚠️ Pendente
**Complexidade:** Média (1-2h)

**Problema:** Alerts nativos são intrusivos e feios
**Solução:** Usar `@mantine/notifications`

**Arquivos afetados:**
- `PDV.jsx`
- `Caixa.jsx`
- `Produtos.jsx`
- `Clientes.jsx`
- `ContasReceber.jsx`

```javascript
// Exemplo
import { notifications } from '@mantine/notifications';

notifications.show({
  title: 'Venda registrada!',
  message: 'Venda finalizada com sucesso',
  color: 'green',
});
```

---

### 5. Adicionar Paginação nos Endpoints
**Status:** ⚠️ Pendente
**Complexidade:** Média (1h)

**Problema:** Endpoints retornam todos os registros
**Solução:** Django REST Framework Pagination

**Endpoints prioritários:**
- `/api/vendas/` - Pode ter centenas de vendas
- `/api/produtos/` - Pode ter muitos produtos
- `/api/contas_receber/` - Pode ter muitas contas

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50
}
```

---

### 6. Adicionar Confirmação Visual de Ações
**Status:** ⚠️ Pendente
**Complexidade:** Baixa (30min)

**Melhorias:**
- Modal de confirmação ao cancelar venda
- Modal de confirmação ao deletar produto
- Modal de confirmação ao deletar cliente
- Feedback visual durante loading (skeleton screens)

---

### 7. Melhorar Validação de Estoque em Tempo Real
**Status:** ⚠️ Pendente
**Complexidade:** Média (1h)

**Problema:** Usuário só descobre estoque insuficiente ao finalizar
**Solução:** Validar estoque ao adicionar item no carrinho

```javascript
// PDV.jsx - adicionarAoCarrinho
if (produto.estoque < quantidade) {
  notifications.show({
    title: 'Estoque insuficiente',
    message: `Disponível: ${produto.estoque}`,
    color: 'red',
  });
  return;
}
```

---

### 8. Adicionar Busca por Código de Barras com Leitor
**Status:** ⚠️ Pendente
**Complexidade:** Média (1-2h)

**Melhoria:** Suporte a leitores de código de barras USB
**Solução:** Detectar Enter após código de barras

```javascript
// PDV.jsx
const handleBarcodeInput = (e) => {
  if (e.key === 'Enter' && busca.length > 5) {
    // Busca automática
    const produto = produtos.find(p => p.codigo_barras === busca);
    if (produto) adicionarAoCarrinho(produto);
  }
};
```

---

## 🟢 PRIORIDADE BAIXA (Melhorias Futuras)

### 9. Adicionar Dashboard com Gráficos
**Status:** ⚠️ Pendente
**Complexidade:** Alta (4-6h)

**Bibliotecas sugeridas:**
- recharts
- victory
- chart.js

**Gráficos sugeridos:**
- Vendas por dia (últimos 30 dias)
- Produtos mais vendidos
- Formas de pagamento (pizza)
- Lucro mensal

---

### 10. Implementar Sistema de Backup Automático
**Status:** ⚠️ Pendente
**Complexidade:** Média (2h)

**Já existe:** `python manage.py backup_db`
**Falta:** Agendar execução automática

**Opções:**
- Celery + Celery Beat (recomendado)
- Cron job no servidor
- Render Cron Jobs (grátis)

---

### 11. Adicionar Impressão de Recibo
**Status:** ⚠️ Pendente
**Complexidade:** Alta (4-6h)

**Funcionalidades:**
- Gerar PDF de recibo após venda
- Imprimir diretamente (window.print)
- Suporte a impressoras térmicas (ESC/POS)

**Bibliotecas:**
- jsPDF (gerar PDF)
- html2canvas (capturar tela)

---

### 12. Adicionar Relatórios Avançados
**Status:** ⚠️ Pendente
**Complexidade:** Alta (6-8h)

**Relatórios sugeridos:**
- Fechamento de caixa detalhado (PDF)
- Relatório de vendas por período
- Relatório de produtos mais vendidos
- Relatório de clientes com mais compras
- Relatório de lucro por produto
- Relatório de contas a receber (vencidas/em dia)

---

### 13. Adicionar Gestão de Fornecedores
**Status:** ⚠️ Pendente
**Complexidade:** Média (3-4h)

**Novas funcionalidades:**
- Cadastro de fornecedores
- Histórico de compras
- Controle de pedidos
- Atualização de preços em lote

---

### 14. Adicionar Sistema de Descontos
**Status:** ⚠️ Pendente
**Complexidade:** Média (2-3h)

**Funcionalidades:**
- Desconto por item
- Desconto total da venda
- Cupons de desconto
- Promoções por período

---

### 15. Melhorar PWA (Progressive Web App)
**Status:** ⚠️ Parcial
**Complexidade:** Média (2-3h)

**Melhorias:**
- Instalar como app no celular
- Notificações push
- Ícones otimizados
- Splash screen
- Cache de imagens de produtos

---

### 16. Adicionar Múltiplos Usuários/Permissões
**Status:** ⚠️ Pendente
**Complexidade:** Alta (6-8h)

**Funcionalidades:**
- Usuários: Admin, Gerente, Vendedor
- Permissões por módulo
- Log de atividades por usuário
- Relatório de vendas por vendedor

---

### 17. Adicionar Integração com WhatsApp
**Status:** ⚠️ Pendente
**Complexidade:** Alta (8-10h)

**Funcionalidades:**
- Enviar recibo por WhatsApp
- Lembrete de conta vencida
- Promoções via WhatsApp
- Status do pedido

**API sugerida:** Twilio, WhatsApp Business API

---

### 18. Adicionar Controle de Validade de Produtos
**Status:** ⚠️ Pendente
**Complexidade:** Média (2-3h)

**Funcionalidades:**
- Campo data_validade no produto
- Alerta de produtos vencendo
- Relatório de produtos vencidos
- Bloqueio de venda de produtos vencidos

---

### 19. Adicionar Sistema de Comissões
**Status:** ⚠️ Pendente
**Complexidade:** Alta (4-6h)

**Funcionalidades:**
- Configurar % de comissão por vendedor
- Relatório de comissões
- Pagamento de comissões

---

### 20. Adicionar Integração Fiscal (NF-e/NFC-e)
**Status:** ⚠️ Pendente
**Complexidade:** Muito Alta (20-30h)

**Atenção:** Requer certificado digital e homologação
**APIs sugeridas:**
- Focus NFe
- eNotas
- Bling

---

## 📊 TESTES E QUALIDADE

### 21. Corrigir Ambiente de Testes
**Status:** ⚠️ Pendente
**Complexidade:** Baixa (30min)

**Problema:** `pytest` não executa por erro de configuração

**Solução:**
```bash
cd backend
export DJANGO_SETTINGS_MODULE=hmconveniencia.settings
pytest core/tests/
```

---

### 22. Adicionar Testes de Integração
**Status:** ⚠️ Pendente
**Complexidade:** Alta (4-6h)

**Cobertura atual:** ~60% (apenas unitários)
**Meta:** 80% (unitários + integração)

---

### 23. Adicionar CI/CD com GitHub Actions
**Status:** ⚠️ Pendente
**Complexidade:** Média (2h)

**Pipeline sugerido:**
```yaml
1. Executar testes
2. Verificar linting
3. Build
4. Deploy automático (se passar)
```

---

## 🎨 MELHORIAS DE UI/UX

### 24. Adicionar Tema Escuro (Dark Mode)
**Status:** ⚠️ Pendente
**Complexidade:** Baixa (1h)

Mantine já suporta, basta implementar toggle.

---

### 25. Melhorar Responsividade Mobile
**Status:** ⚠️ Parcial
**Complexidade:** Média (2-3h)

**Áreas a melhorar:**
- PDV em telas pequenas
- Tabelas em mobile (scroll horizontal)
- Formulários em mobile

---

### 26. Adicionar Atalhos de Teclado
**Status:** ⚠️ Pendente
**Complexidade:** Média (2h)

**Sugestões:**
- F1 - PDV
- F2 - Caixa
- F3 - Produtos
- Ctrl+F - Buscar produto
- F8 - Finalizar venda

---

### 27. Adicionar Tutorial/Onboarding
**Status:** ⚠️ Pendente
**Complexidade:** Média (3-4h)

**Primeira vez no sistema:**
- Tour guiado
- Explicação de cada módulo
- Vídeos tutoriais

---

## 📱 MOBILE E OFFLINE

### 28. Melhorar Sincronização Offline
**Status:** ✅ Funcionando
**Melhorias possíveis:**
- Sincronizar produtos modificados
- Sincronizar novos clientes
- Sincronizar preços atualizados

---

### 29. Adicionar Modo Offline Completo
**Status:** ⚠️ Parcial
**Complexidade:** Alta (8-10h)

**Funcionalidades offline:**
- ✅ Cadastrar vendas
- ⚠️ Cadastrar produtos
- ⚠️ Cadastrar clientes
- ⚠️ Abrir/fechar caixa

---

## 🔧 INFRAESTRUTURA

### 30. Migrar para PostgreSQL Local (Dev)
**Status:** ⚠️ Pendente
**Complexidade:** Baixa (30min)

**Atualmente:** SQLite (dev) + PostgreSQL (prod)
**Recomendado:** PostgreSQL em ambos

---

### 31. Adicionar Monitoramento de Erros
**Status:** ⚠️ Pendente
**Complexidade:** Baixa (1h)

**Ferramentas sugeridas:**
- Sentry (grátis até 5k eventos/mês)
- LogRocket
- Rollbar

---

### 32. Adicionar Health Check Endpoint
**Status:** ⚠️ Pendente
**Complexidade:** Baixa (15min)

```python
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'database': 'connected',
        'timestamp': timezone.now().isoformat()
    })
```

---

## 📚 DOCUMENTAÇÃO

### 33. Criar Documentação da API
**Status:** ⚠️ Pendente
**Complexidade:** Baixa (2h)

**Ferramentas:**
- drf-yasg (Swagger)
- Django REST Framework Docs

---

### 34. Criar Manual do Usuário
**Status:** ⚠️ Pendente
**Complexidade:** Média (4-6h)

**Conteúdo:**
- Como fazer uma venda
- Como gerenciar estoque
- Como controlar caixa
- Como gerar relatórios
- FAQ

---

### 35. Criar Vídeo Tutorial
**Status:** ⚠️ Pendente
**Complexidade:** Média (4-6h)

---

## PRIORIZAÇÃO SUGERIDA (PRÓXIMOS PASSOS)

### Sprint 1 (Esta Semana - 4h)
1. ✅ Corrigir vulnerabilidades npm (5min)
2. ✅ Validação de data mínima FIADO (15min)
3. ✅ Substituir alerts por toasts (2h)
4. ✅ Validação de estoque em tempo real (1h)

### Sprint 2 (Próxima Semana - 8h)
1. ✅ Adicionar paginação (2h)
2. ✅ Confirmação visual de ações (1h)
3. ✅ Busca por código de barras (2h)
4. ✅ Rate limiting (1h)
5. ✅ Corrigir ambiente de testes (30min)
6. ✅ Health check endpoint (15min)

### Sprint 3 (Mês seguinte - 16h)
1. ✅ Dashboard com gráficos (6h)
2. ✅ Impressão de recibo (4h)
3. ✅ Sistema de backup automático (2h)
4. ✅ Relatórios avançados (4h)

---

## ✅ MELHORIAS JÁ IMPLEMENTADAS (Hoje)

1. ✅ Tratamento adequado de erros no PDV
2. ✅ Mensagens de erro claras do backend
3. ✅ Correção de conversão de data FIADO
4. ✅ Correção definitiva do IndexedDB
5. ✅ Validação de data_vencimento obrigatória
6. ✅ Documentação completa do projeto
7. ✅ Configuração de deploy Render

---

**Total de melhorias sugeridas:** 35
**Implementadas hoje:** 7
**Pendentes:** 28

**Próximo foco:** Melhorias de UX (toasts, validações em tempo real)
