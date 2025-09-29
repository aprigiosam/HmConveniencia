# 🚀 Guia de Deploy para Produção - Comércio Pro

## ✅ Checklist Pré-Deploy

### 1. Preparação do Ambiente
- [ ] Servidor Linux configurado (Ubuntu 20.04+ recomendado)
- [ ] Docker e Docker Compose instalados
- [ ] Domínio configurado apontando para o servidor
- [ ] Certificado SSL configurado (Let's Encrypt recomendado)
- [ ] Firewall configurado (portas 80, 443, 22)

### 2. Configuração de Variáveis
- [ ] Arquivo `.env.prod` criado e configurado
- [ ] Chaves secretas geradas
- [ ] Senhas seguras definidas
- [ ] URLs de produção configuradas

## 🔧 Passos para Deploy

### 1. Clonar o Repositório
```bash
git clone [URL_DO_REPOSITORIO]
cd comercio-pro
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar template de produção
cp .env.prod.example .env.prod

# Editar configurações (IMPORTANTE!)
nano .env.prod
```

**Variáveis obrigatórias em `.env.prod`:**
```env
POSTGRES_PASSWORD=SuaSenhaSeguraAqui123!
SECRET_KEY=sua-chave-django-de-50-caracteres-super-secreta-aqui
ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com
CSRF_TRUSTED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
VITE_API_URL=https://seu-dominio.com/api/v1
HTTP_PORT=8080
HTTPS_PORT=443
```

### 3. Configurar SSL (Opcional mas Recomendado)
```bash
# Criar diretório SSL
mkdir -p nginx/ssl

# Colocar certificados (cert.pem e key.pem) em nginx/ssl/
# Descomentar configuração HTTPS no nginx/nginx.conf
```

### 4. Deploy
```bash
# Deploy completo (usa docker-compose diretamente)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# OU usando Makefile (certifique-se de que o .env.prod está pronto)
make prod-deploy

# Sequência manual
make prod-build
make prod-up
make prod-migrate
make prod-collectstatic
```

### 5. Verificar Deploy
```bash
# Verificar status dos serviços
make prod-status

# Ver logs
make prod-logs

# Verificar saúde da aplicação
curl http://seu-dominio.com/health
```

## 🔍 Comandos Úteis de Produção

```bash
# Parar ambiente
make prod-down

# Backup do banco
make backup-prod NAME=antes-atualizacao

# Restaurar backup
make restore-prod BACKUP_FILE=prod_backup_20231201_120000.sql.gz

# Ver logs específicos
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs nginx

# Executar comando no backend
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell

# Criar superusuário
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

## 🛡️ Segurança Implementada

### Configurações de Segurança
- ✅ DEBUG=False em produção
- ✅ Chaves secretas seguras
- ✅ HTTPS com certificados SSL
- ✅ Headers de segurança (HSTS, CSP, X-Frame-Options)
- ✅ Rate limiting nas APIs
- ✅ Nginx como proxy reverso
- ✅ Separação de redes Docker
- ✅ Volumes persistentes para dados

### Headers de Segurança Configurados
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection`
- `Referrer-Policy`

## 📊 Monitoramento

### Logs
```bash
# Logs gerais
make prod-logs

# Logs com filtro
docker-compose -f docker-compose.prod.yml logs --tail=100 -f backend

# Logs de erro do Nginx
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/error.log
```

### Health Checks
- **Frontend**: `http://seu-dominio.com/health`
- **Backend API**: `http://seu-dominio.com/api/v1/health/`
- **Admin Django**: `http://seu-dominio.com/admin/`
- **Documentação API**: `http://seu-dominio.com/docs/`

## 🔄 Atualizações

### Atualizar Aplicação
```bash
# Fazer backup
make backup

# Atualizar código
git pull origin main

# Rebuild e redeploy
make prod-build
make prod-up
make prod-migrate
make prod-collectstatic

# Verificar funcionamento
make prod-status
```

### Rollback em Caso de Problema
```bash
# Voltar para versão anterior
git checkout [COMMIT_ANTERIOR]
make prod-build
make prod-up

# Ou restaurar backup do banco
make restore BACKUP_FILE=backup_antes_da_atualizacao.sql
```

## 🚨 Troubleshooting

### Problema: Serviços não sobem
```bash
# Verificar logs
make prod-logs

# Verificar configuração
cat .env.prod

# Verificar portas em uso
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

### Problema: Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
make prod-status

# Verificar conectividade
docker-compose -f docker-compose.prod.yml exec backend python manage.py dbshell
```

### Problema: Frontend não carrega
```bash
# Verificar se build foi feito
docker-compose -f docker-compose.prod.yml exec frontend ls /app/dist

# Verificar configuração do Nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Recarregar Nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## 📞 Suporte

### Informações do Sistema
- **Linguagem Backend**: Python/Django 5.2.6
- **Frontend**: React 18 + TypeScript + Vite
- **Banco de Dados**: PostgreSQL 15
- **Cache**: Redis 7
- **Proxy**: Nginx
- **Containerização**: Docker + Docker Compose

### Contatos
- Documentação completa: Ver README.md
- Issues: [LINK_DO_REPOSITORIO]/issues

---

## ⚠️ IMPORTANTE

**Antes de fazer deploy em produção:**
1. ✅ Teste todo o fluxo em ambiente de staging
2. ✅ Configure backup automático do banco de dados
3. ✅ Configure monitoramento (uptime, logs, métricas)
4. ✅ Documente as configurações específicas do seu ambiente
5. ✅ Treine a equipe nos procedimentos de manutenção

**Nunca faça deploy em produção sem:**
- Configurar senhas seguras
- Configurar domínio e SSL
- Testar backup e restore
- Definir procedimentos de emergência
