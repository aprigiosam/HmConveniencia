.PHONY: help build up down logs shell migrate test install

COMPOSE ?= docker compose
COMPOSE_PROD = $(COMPOSE) -f docker-compose.prod.yml --env-file .env.prod

DB_NAME ?= comercio_db
DB_USER ?= comercio_user
BACKUP_DIR ?= backup

help: ## Mostrar ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $1, $2}'

build: ## Construir containers
	$(COMPOSE) build

up: ## Subir ambiente
	$(COMPOSE) up -d

down: ## Parar ambiente
	$(COMPOSE) down

logs: ## Ver logs
	$(COMPOSE) logs -f

shell: ## Acessar shell do backend
	$(COMPOSE) exec backend python manage.py shell

migrate: ## Executar migracoes
	$(COMPOSE) exec backend python manage.py migrate

makemigrations: ## Criar migracoes
	$(COMPOSE) exec backend python manage.py makemigrations

createsuperuser: ## Criar superusuario
	$(COMPOSE) exec backend python manage.py createsuperuser

loaddata: ## Carregar dados iniciais
	$(COMPOSE) exec backend python manage.py shell -c "exec(open('scripts/load_initial_data.py').read())"

setup-vencimento: ## Configurar dados de vencimento
	$(COMPOSE) exec backend python manage.py shell -c "exec(open('scripts/setup_vencimento.py').read())"

backup: ## Fazer backup (usar opcional NAME=descricao)
	@mkdir -p $(BACKUP_DIR)
	@STAMP=$${NAME:-$$(date +%Y%m%d_%H%M%S)}; \
	FILE="$(BACKUP_DIR)/dev_backup_$${STAMP}.sql.gz"; \
	echo "Gerando $$FILE"; \
	$(COMPOSE) exec -T db pg_dump -U $(DB_USER) $(DB_NAME) | gzip > $$FILE; \
	echo "Backup salvo em $$FILE"

backup-prod: ## Backup do banco em producao (usar opcional NAME=descricao)
	@if [ ! -f .env.prod ]; then echo "ERRO: Arquivo .env.prod nao encontrado. Copie .env.prod.example e configure."; exit 1; fi
	@mkdir -p $(BACKUP_DIR)
	@STAMP=$${NAME:-$$(date +%Y%m%d_%H%M%S)}; \
	FILE="$(BACKUP_DIR)/prod_backup_$${STAMP}.sql.gz"; \
	echo "Gerando $$FILE"; \
	$(COMPOSE_PROD) exec -T db pg_dump -U $(DB_USER) $(DB_NAME) | gzip > $$FILE; \
	echo "Backup salvo em $$FILE"

restore: ## Restaurar backup (usar BACKUP_FILE=arquivo.sql[.gz])
	@if [ -z "$(BACKUP_FILE)" ]; then echo "Use: make restore BACKUP_FILE=arquivo.sql[.gz]"; exit 1; fi
	@if [ ! -f $(BACKUP_DIR)/$(BACKUP_FILE) ]; then echo "Arquivo $(BACKUP_DIR)/$(BACKUP_FILE) nao encontrado"; exit 1; fi
	@echo "Restaurando $(BACKUP_DIR)/$(BACKUP_FILE)..."
	@if echo "$(BACKUP_FILE)" | grep -q '\.gz$$'; then \
		gunzip -c $(BACKUP_DIR)/$(BACKUP_FILE) | $(COMPOSE) exec -T db psql -U $(DB_USER) -d $(DB_NAME); \
	else \
		cat $(BACKUP_DIR)/$(BACKUP_FILE) | $(COMPOSE) exec -T db psql -U $(DB_USER) -d $(DB_NAME); \
	fi
	@echo "Restauracao concluida"

restore-prod: ## Restaurar backup em producao (usar BACKUP_FILE=arquivo.sql[.gz])
	@if [ -z "$(BACKUP_FILE)" ]; then echo "Use: make restore-prod BACKUP_FILE=arquivo.sql[.gz]"; exit 1; fi
	@if [ ! -f .env.prod ]; then echo "ERRO: Arquivo .env.prod nao encontrado. Copie .env.prod.example e configure."; exit 1; fi
	@if [ ! -f $(BACKUP_DIR)/$(BACKUP_FILE) ]; then echo "Arquivo $(BACKUP_DIR)/$(BACKUP_FILE) nao encontrado"; exit 1; fi
	@echo "Restaurando $(BACKUP_DIR)/$(BACKUP_FILE) em producao..."
	@if echo "$(BACKUP_FILE)" | grep -q '\.gz$$'; then \
		gunzip -c $(BACKUP_DIR)/$(BACKUP_FILE) | $(COMPOSE_PROD) exec -T db psql -U $(DB_USER) -d $(DB_NAME); \
	else \
		cat $(BACKUP_DIR)/$(BACKUP_FILE) | $(COMPOSE_PROD) exec -T db psql -U $(DB_USER) -d $(DB_NAME); \
	fi
	@echo "Restauracao concluida"

status: ## Verificar status dos servicos
	$(COMPOSE) ps

install: ## Instalacao completa
	@echo "Instalando Sistema Comercio Pro..."
	make build
	make up
	@echo "Aguardando servicos iniciarem..."
	sleep 30
	@echo "Sistema instalado com sucesso!"
	@echo
	@echo "Acessos:"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend API: http://localhost:8000/api/v1"
	@echo "   Documentacao API: http://localhost:8000/api/docs"
	@echo "   Admin Django: http://localhost:8000/admin"
	@echo
	@echo "Credenciais padrao:"
	@echo "   Usuario: admin"
	@echo "   Senha: admin123"
	@echo
	@echo "Comandos uteis:"
	@echo "   make logs     - Ver logs dos servicos"
	@echo "   make status   - Verificar status"
	@echo "   make backup   - Fazer backup do banco"
	@echo "   make down     - Parar sistema"

reset: ## Reset completo (CUIDADO: apaga todos os dados)
	@echo "ATENCAO: Esta operacao vai apagar todos os dados."
	@read -p "Tem certeza? Digite 'reset' para confirmar: " confirm && [ "$$confirm" = "reset" ]
	$(COMPOSE) down -v
	docker system prune -f
	make install

quick-start: ## Inicio rapido para desenvolvimento
	@echo "Iniciando ambiente..."
	make up
	@echo "Aguardando 15 segundos..."
	sleep 15
	@echo "Sistema pronto!"

dev: ## Modo desenvolvimento
	$(COMPOSE) up

prod-build: ## Construir containers para producao
	@if [ ! -f .env.prod ]; then echo "ERRO: Arquivo .env.prod nao encontrado. Copie .env.prod.example e configure."; exit 1; fi
	$(COMPOSE_PROD) build

prod-up: ## Subir ambiente de producao
	@if [ ! -f .env.prod ]; then echo "ERRO: Arquivo .env.prod nao encontrado. Copie .env.prod.example e configure."; exit 1; fi
	$(COMPOSE_PROD) up -d

prod-down: ## Parar ambiente de producao
	$(COMPOSE_PROD) down

prod-logs: ## Ver logs de producao
	$(COMPOSE_PROD) logs -f

prod-status: ## Status dos servicos de producao
	$(COMPOSE_PROD) ps

prod-migrate: ## Executar migracoes em producao
	$(COMPOSE_PROD) exec backend python manage.py migrate

prod-collectstatic: ## Coletar arquivos estaticos para producao
	$(COMPOSE_PROD) exec backend python manage.py collectstatic --noinput

prod-deploy: ## Deploy completo para producao
	@if [ ! -f .env.prod ]; then echo "ERRO: Arquivo .env.prod nao encontrado. Copie .env.prod.example e configure."; exit 1; fi
	@echo "Iniciando deploy para producao..."
	make prod-build
	make prod-up
	@echo "Aguardando servicos iniciarem..."
	sleep 30
	make prod-migrate
	make prod-collectstatic
	@echo "Deploy finalizado!"
	@echo "Verifique o status com: make prod-status"

prod: ## Modo producao (alias para prod-deploy)
	make prod-deploy
