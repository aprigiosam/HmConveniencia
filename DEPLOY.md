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
# Copiar template
cp .env.example .env

# Editar configurações (IMPORTANTE!)
nano .env
```

**Variáveis obrigatórias em `.env`:**
```env
POSTGRES_PASSWORD=SuaSenhaSeguraAqui123!
SECRET_KEY=sua-chave-django-de-50-caracteres-super-secreta-aqui
ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com
CSRF_TRUSTED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
VITE_API_URL=https://seu-dominio.com/api/v1
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
# Deploy completo de produção
docker compose up --profile prod -d --build

# Aplicar migrações
docker compose exec backend python manage.py migrate

# Coletar arquivos estáticos
docker compose exec backend python manage.py collectstatic --noinput

# Criar superusuário
docker compose exec backend python manage.py createsuperuser
```

### 5. Verificar Deploy
```bash
# Verificar status dos serviços
docker compose ps

# Ver logs
docker compose logs -f

# Verificar saúde da aplicação
curl http://seu-dominio.com/health
```

## 🔍 Comandos Úteis de Produção

```bash
# Parar ambiente
docker compose down

# Ver logs específicos
docker compose logs backend
docker compose logs frontend
docker compose logs nginx

# Ver logs em tempo real
docker compose logs -f backend

# Executar comando no backend
docker compose exec backend python manage.py shell

# Backup do banco
docker compose exec db pg_dump -U comercio_user comercio_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restaurar backup
gunzip < backup_file.sql.gz | docker compose exec -T db psql -U comercio_user comercio_db

# Reiniciar serviço específico
docker compose restart backend
docker compose restart nginx
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
docker compose logs

# Logs com filtro
docker compose logs --tail=100 -f backend

# Logs de erro do Nginx
docker compose exec nginx tail -f /var/log/nginx/error.log
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
docker compose exec db pg_dump -U comercio_user comercio_db | gzip > backup_antes_update.sql.gz

# Atualizar código
git pull origin main

# Rebuild e redeploy
docker compose up --profile prod -d --build

# Aplicar migrações
docker compose exec backend python manage.py migrate

# Coletar estáticos
docker compose exec backend python manage.py collectstatic --noinput

# Verificar funcionamento
docker compose ps
```

### Rollback em Caso de Problema
```bash
# Voltar para versão anterior
git checkout [COMMIT_ANTERIOR]
docker compose up --profile prod -d --build

# Ou restaurar backup do banco
gunzip < backup_antes_update.sql.gz | docker compose exec -T db psql -U comercio_user comercio_db
```

## 🚨 Troubleshooting

### Problema: Serviços não sobem
```bash
# Verificar logs
docker compose logs

# Verificar configuração
cat .env

# Verificar portas em uso
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

### Problema: Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
docker compose ps

# Verificar conectividade
docker compose exec backend python manage.py dbshell
```

### Problema: Frontend não carrega
```bash
# Verificar se build foi feito (produção)
docker compose exec frontend-prod ls /usr/share/nginx/html

# Verificar configuração do Nginx
docker compose exec nginx nginx -t

# Recarregar Nginx
docker compose exec nginx nginx -s reload
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
