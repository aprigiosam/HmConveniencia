# Guia de Monitoramento - Comércio Pro

Este documento descreve o sistema de monitoramento implementado no Comércio Pro.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Health Checks](#health-checks)
- [Métricas do Sistema](#métricas-do-sistema)
- [Dashboard](#dashboard)
- [Logs](#logs)
- [Alertas](#alertas)
- [Comandos Úteis](#comandos-úteis)
- [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

O sistema de monitoramento oferece observabilidade completa através de:

- **Health Checks**: Status dos serviços críticos
- **Métricas**: Performance e dados de negócio
- **Logs Estruturados**: Auditoria e debugging
- **Dashboard Visual**: Interface web para monitoramento

### Endpoints de Monitoramento

| Endpoint | Descrição | Autenticação |
|----------|-----------|--------------|
| `/api/v1/health/` | Status geral do sistema | Não |
| `/api/v1/monitoring/metrics/` | Métricas do sistema | Não |
| `/api/v1/monitoring/status/` | Recursos do servidor | Não |

## 🏥 Health Checks

### Endpoint Principal
```
GET /api/v1/health/
```

### Resposta de Exemplo
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "response_time_ms": 45.2,
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful"
    },
    "redis": {
      "status": "healthy",
      "message": "Redis connection successful"
    }
  }
}
```

### Estados Possíveis
- `healthy`: Todos os serviços funcionando
- `unhealthy`: Um ou mais serviços com problema

### Comando Rápido
```bash
make health-check
```

## 📊 Métricas do Sistema

### Endpoint
```
GET /api/v1/monitoring/metrics/
```

### Dados Coletados

#### Métricas de Negócio
- Total de produtos cadastrados
- Total de categorias e fornecedores
- Vendas totais, diárias e semanais
- Valor de vendas nas últimas 24h

#### Métricas de Performance
- Conexões ativas ao banco
- Tempo de resposta das APIs
- Requests por segundo

### Exemplo de Resposta
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": {
    "produtos_total": 1250,
    "categorias_total": 45,
    "fornecedores_total": 23,
    "vendas_total": 8932,
    "vendas_hoje": 15,
    "vendas_ultima_semana": 89
  },
  "vendas_24h": {
    "total_valor": 2850.75,
    "total_vendas": 28
  },
  "performance": {
    "active_connections": 5
  }
}
```

### Comando Rápido
```bash
make metrics
```

## 📈 Dashboard

### Acesso
```
http://localhost:3000/monitoring
```

### Funcionalidades
- **Auto-refresh**: Atualização automática a cada 30s
- **Status Cards**: Visão geral dos serviços
- **Métricas de Negócio**: Vendas, produtos, performance
- **Recursos do Sistema**: CPU, memória, disco
- **Histórico Visual**: Gráficos em tempo real

### Screenshots do Dashboard

#### Status dos Serviços
- ✅ Status Geral: Healthy
- ✅ Database: Conectado
- ✅ Redis Cache: Funcionando

#### Métricas de Negócio
- Produtos cadastrados
- Vendas do dia/semana
- Valor total de vendas 24h

#### Recursos do Sistema
- Uso de CPU e memória
- Espaço em disco
- Uptime do sistema

## 📝 Logs

### Localização
```
backend/logs/
├── django.log          # Logs gerais do Django
├── monitoring.log      # Requests e monitoramento
├── errors.log          # Erros do sistema
└── performance.log     # Requests lentas (>2s)
```

### Configuração de Logs

#### Níveis de Log
- `INFO`: Operações normais
- `WARNING`: Requests lentas, problemas menores
- `ERROR`: Erros que afetam funcionalidades

#### Rotação Automática
- **Tamanho máximo**: 10MB por arquivo
- **Backups**: 5-10 arquivos históricos
- **Compressão**: Automática

### Formato dos Logs

#### Estruturado (JSON)
```json
{
  "level": "INFO",
  "time": "2024-01-15T10:30:00",
  "logger": "apps.core.middleware.monitoring",
  "message": "Request: GET /api/v1/produtos/",
  "request_id": "1642248600123456",
  "response_time": 0.125,
  "status_code": 200,
  "user_id": 1,
  "ip_address": "192.168.1.100"
}
```

#### Tradicional
```
INFO 2024-01-15 10:30:00 middleware 1234 5678 Request: GET /api/v1/produtos/
```

### Comando para Monitorar Logs
```bash
make logs-monitoring
```

## ⚠️ Alertas

### Alertas Automáticos

#### Critérios de Alerta
- **Response Time > 2s**: Request lenta
- **HTTP 5xx**: Erro interno do servidor
- **Database connection failed**: Falha na conexão
- **Redis connection failed**: Cache indisponível
- **Memory usage > 90%**: Memória crítica
- **Disk usage > 85%**: Espaço em disco baixo

#### Logs de Alerta
```bash
# Monitora alertas em tempo real
tail -f backend/logs/monitoring.log | grep -E "(ERROR|WARNING)"
```

### Configuração de Alertas (Futuro)

#### Email
```python
# settings.py
EMAIL_ALERTS = {
    'enabled': True,
    'recipients': ['admin@empresa.com'],
    'smtp_host': 'smtp.gmail.com',
    'smtp_port': 587
}
```

#### Slack
```python
# settings.py
SLACK_ALERTS = {
    'enabled': True,
    'webhook_url': 'https://hooks.slack.com/...',
    'channel': '#alerts'
}
```

## 🛠️ Comandos Úteis

### Verificações Rápidas
```bash
# Status geral
make health-check

# Métricas atuais
make metrics

# Status do Docker
make status

# Logs em tempo real
make logs

# Logs de monitoramento
make logs-monitoring
```

### Diagnóstico Avançado
```bash
# Conexões ao banco
docker compose exec backend python manage.py dbshell

# Estado do Redis
docker compose exec redis redis-cli ping

# Uso de recursos
docker stats

# Logs específicos
docker compose logs backend
docker compose logs db
docker compose logs redis
```

### Testes de Load (Opcional)
```bash
# Teste simples
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:8000/api/v1/health/

# Com Apache Bench
ab -n 100 -c 10 http://localhost:8000/api/v1/health/
```

## 🔧 Troubleshooting

### Problemas Comuns

#### Health Check Failing
```bash
# 1. Verificar se serviços estão rodando
make status

# 2. Verificar logs
make logs

# 3. Reiniciar serviços
make down && make up
```

#### Database Connection Issues
```bash
# Verificar conexão
docker compose exec backend python manage.py dbshell

# Logs do PostgreSQL
docker compose logs db

# Reiniciar apenas o banco
docker compose restart db
```

#### High Memory Usage
```bash
# Verificar uso atual
docker stats

# Logs de memória
grep -i memory backend/logs/monitoring.log

# Reiniciar se necessário
docker compose restart backend
```

#### Slow Requests
```bash
# Identificar requests lentas
grep "Slow Request" backend/logs/monitoring.log

# Top requests por tempo
grep "response_time" backend/logs/monitoring.log | sort -k7 -nr | head -10
```

### Logs de Debug

#### Django Debug Mode
```bash
# Temporariamente
docker compose exec backend python manage.py runserver --settings=comercio.settings_debug

# Logs verbosos
tail -f backend/logs/django.log | grep DEBUG
```

#### Profiling de Performance
```python
# Adicionar no código temporariamente
import cProfile
import pstats

def profile_view(view_func):
    def wrapper(*args, **kwargs):
        profiler = cProfile.Profile()
        profiler.enable()
        result = view_func(*args, **kwargs)
        profiler.disable()

        stats = pstats.Stats(profiler)
        stats.sort_stats('cumulative')
        stats.print_stats()

        return result
    return wrapper
```

### Backup dos Logs
```bash
# Compactar logs antigos
tar -czf logs_backup_$(date +%Y%m%d).tar.gz backend/logs/

# Mover para storage externo
rsync -av logs_backup_*.tar.gz /mnt/backup/
```

## 📚 Integração com Ferramentas Externas

### Grafana (Futuro)
- Dashboard visual avançado
- Alertas customizáveis
- Histórico de longo prazo

### Prometheus (Futuro)
- Coleta de métricas
- Armazenamento de time series
- Alerting integrado

### ELK Stack (Futuro)
- Elasticsearch para busca em logs
- Logstash para processamento
- Kibana para visualização

---

💡 **Dica**: Configure alertas por email/Slack para ser notificado proativamente sobre problemas!