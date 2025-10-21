# 🤖 Agentes Claude Code - HMConveniencia

Documentação dos agentes especializados para auxiliar no desenvolvimento do projeto.

## 📁 Estrutura

```
.claude/
├── README.md                        # Este arquivo
├── hmconveniencia-context.md        # Contexto completo do projeto
├── code-review-agent.md             # Guia detalhado de code review
└── commands/                        # Comandos slash
    ├── code-review.md               # /code-review <arquivo>
    ├── test.md                      # /test
    ├── deploy.md                    # /deploy
    ├── fix.md                       # /fix
    └── feature.md                   # /feature
```

## 🎯 Agentes Disponíveis

### **1. Code Review Agent**
**Comando:** `/code-review <arquivo>`
**Quando usar:** Antes de commit, após implementar funcionalidade

**O que faz:**
- Analisa qualidade do código
- Verifica segurança e performance
- Identifica N+1 queries
- Sugere otimizações
- Verifica padrões Django/DRF

**Exemplo:**
```
/code-review backend/core/views.py
```

---

### **2. Testing Agent**
**Comando:** `/test`
**Quando usar:** Criar testes automatizados

**O que faz:**
- Cria testes de models
- Cria testes de API
- Testes de integração
- Configuração de coverage
- Fixtures e factories

**Exemplo:**
```
/test
# Ou especificar: "criar testes para VendaViewSet"
```

---

### **3. Deploy Agent**
**Comando:** `/deploy`
**Quando usar:** Antes de deploy, troubleshooting produção

**O que faz:**
- Checklist pré-deploy
- Troubleshooting comum (500, build timeout, Redis)
- Verificação de variáveis de ambiente
- Comandos úteis
- Rollback de deploy

**Exemplo:**
```
/deploy
# Ou: "build travando no Render, o que fazer?"
```

---

### **4. Bug Fix Agent**
**Comando:** `/fix`
**Quando usar:** Investigar e corrigir bugs

**O que faz:**
- Processo metódico de debug
- Reprodução do bug
- Criação de teste que falha
- Implementação da correção
- Validação

**Exemplo:**
```
/fix
# Depois descrever: "estoque ficando negativo ao cancelar venda"
```

---

### **5. Feature Agent**
**Comando:** `/feature`
**Quando usar:** Implementar nova funcionalidade

**O que faz:**
- Planejamento de feature
- Implementação backend (model, serializer, view)
- Implementação frontend (component, service)
- Testes
- Documentação

**Exemplo:**
```
/feature
# Depois descrever: "implementar exportação de vendas em CSV"
```

---

## 🚀 Próximos Passos Recomendados

Com base no code review realizado, aqui está a ordem sugerida de ações:

### **Fase 1: Correções Críticas (1-2 dias)**

1. **Aplicar correções de segurança e integridade:**
   ```bash
   # Usar /fix ou implementar manualmente:
   - Adicionar @transaction.atomic em cancelar() e fechar()
   - Adicionar select_for_update() em fechar()
   - Adicionar validações de input em abrir() e fechar()
   ```

2. **Aplicar índices no banco de dados:**
   ```bash
   # Via DBeaver, executar:
   add_indexes.sql
   ```

3. **Corrigir query subótima:**
   ```python
   # backend/core/views.py:126
   # Trocar OR de queryset para Q()
   ```

### **Fase 2: Testes (3-5 dias)**

4. **Criar testes automatizados:**
   ```bash
   /test
   # Focar em:
   - Testes de vendas (criar, cancelar, receber)
   - Testes de caixa (abrir, fechar, movimentar)
   - Testes de validações de negócio (estoque, limite_credito)
   ```

5. **Configurar coverage:**
   ```bash
   cd backend
   pip install coverage
   coverage run --source='.' manage.py test
   coverage report
   coverage html  # Ver relatório visual
   ```

### **Fase 3: Melhorias de Código (2-3 dias)**

6. **Adicionar logging:**
   ```python
   # Operações críticas (cancelar venda, fechar caixa, receber)
   ```

7. **Refatorar dashboard():**
   ```python
   # Extrair métodos privados para melhor manutenibilidade
   ```

8. **Melhorar tratamento de exceptions:**
   ```python
   # Especificar tipos em vez de Exception genérica
   ```

### **Fase 4: Novas Features (conforme prioridade)**

9. **Implementar features do backlog:**
   ```bash
   /feature
   # Sugestões (ordem de prioridade):
   - Recebimento múltiplo de contas (bulk)
   - Exportação CSV de vendas
   - Relatório de vendas por período
   - Dashboard de métricas
   ```

---

## 📊 Status Atual do Projeto

✅ **Funcionando bem:**
- Cache Redis implementado (80% melhoria)
- Rate limiting configurado
- Queries otimizadas (annotate/aggregate)
- API completa (25 endpoints)
- Frontend React funcional

⚠️ **Precisa atenção:**
- Falta transações atômicas (race conditions possíveis)
- Falta testes automatizados (0% coverage)
- Alguns métodos muito longos (dashboard: 139 linhas)
- Falta logging de auditoria

🔴 **Crítico para corrigir:**
- `cancelar()` sem transaction (pode deixar estoque inconsistente)
- `fechar()` sem select_for_update (race condition possível)
- Validação de input fraca em alguns endpoints

---

## 🛠️ Como Usar os Agentes

### **Método 1: Comandos Slash**
```bash
/code-review backend/core/views.py
/test
/deploy
/fix
/feature
```

### **Método 2: Mensagem Direta**
```
"Faça um code review do arquivo views.py"
"Crie testes para o VendaViewSet"
"O build está travando no Render, me ajude"
"Tenho um bug: estoque ficando negativo"
"Quero implementar exportação CSV de vendas"
```

### **Método 3: Leitura Manual**
```bash
# Abrir os arquivos .md para consulta:
cat .claude/code-review-agent.md
cat .claude/commands/test.md
```

---

## 📝 Convenções

**Commits:**
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `refactor:` Refatoração sem mudar comportamento
- `test:` Adicionar/modificar testes
- `docs:` Documentação
- `perf:` Melhoria de performance
- `chore:` Tarefas gerais

**Branches:**
- `main` - Produção (auto-deploy)
- `develop` - Desenvolvimento (se necessário)
- `feature/nome` - Nova feature
- `fix/nome` - Correção de bug

---

## 🔗 Links Úteis

- **Context Doc:** `.claude/hmconveniencia-context.md`
- **API Produção:** https://hmconveniencia-api.onrender.com/api/
- **Health Check:** https://hmconveniencia-api.onrender.com/api/health/
- **Frontend:** https://hmconveniencia.onrender.com
- **Render Dashboard:** https://dashboard.render.com/
- **Upstash Console:** https://console.upstash.com/

---

**Última atualização:** 2025-10-20
**Versão:** 1.0.0
