.PHONY: help build up down logs shell migrate test install

help: ## Mostrar ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $1, $2}'

build: ## Construir containers
	docker-compose build

up: ## Subir ambiente
	docker-compose up -d

down: ## Parar ambiente
	docker-compose down

logs: ## Ver logs
	docker-compose logs -f

shell: ## Acessar shell do backend
	docker-compose exec backend python manage.py shell

migrate: ## Executar migracoes
	docker-compose exec backend python manage.py migrate

makemigrations: ## Criar migracoes
	docker-compose exec backend python manage.py makemigrations

createsuperuser: ## Criar superusuario
	docker-compose exec backend python manage.py createsuperuser

loaddata: ## Carregar dados iniciais
	docker-compose exec backend python manage.py shell -c "exec(open('scripts/load_initial_data.py').read())"

setup-vencimento: ## Configurar dados de vencimento
	docker-compose exec backend python manage.py shell -c "exec(open('scripts/setup_vencimento.py').read())"

backup: ## Fazer backup
	@echo "Iniciando backup..."
	docker-compose exec db pg_dump -U comercio_user comercio_db > backup/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup salvo em backup/"

restore: ## Restaurar backup (usar BACKUP_FILE=nome_do_arquivo)
	@if [ -z "$(BACKUP_FILE)" ]; then echo "Use: make restore BACKUP_FILE=arquivo.sql"; exit 1; fi
	docker-compose exec -T db psql -U comercio_user -d comercio_db < backup/$(BACKUP_FILE)

status: ## Verificar status dos servicos
	docker-compose ps

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
	docker-compose down -v
	docker system prune -f
	make install

quick-start: ## Inicio rapido para desenvolvimento
	@echo "Iniciando ambiente..."
	make up
	@echo "Aguardando 15 segundos..."
	sleep 15
	@echo "Sistema pronto!"

dev: ## Modo desenvolvimento
	docker-compose up

prod: ## Modo producao (usar docker-compose.prod.yml)
	@if [ ! -f docker-compose.prod.yml ]; then echo "Arquivo docker-compose.prod.yml nao encontrado"; exit 1; fi
	docker-compose -f docker-compose.prod.yml up -d
