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

migrate: ## Executar migrações
	docker-compose exec backend python manage.py migrate

makemigrations: ## Criar migrações
	docker-compose exec backend python manage.py makemigrations

createsuperuser: ## Criar superusuário
	docker-compose exec backend python manage.py createsuperuser

loaddata: ## Carregar dados iniciais
	docker-compose exec backend python manage.py shell -c "exec(open('scripts/load_initial_data.py').read())"

setup-vencimento: ## Configurar dados de vencimento
	docker-compose exec backend python manage.py shell -c "exec(open('scripts/setup_vencimento.py').read())"

backup: ## Fazer backup
	@echo "📦 Fazendo backup..."
	docker-compose exec db pg_dump -U comercio_user comercio_db > backup/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup salvo em backup/"

restore: ## Restaurar backup (usar BACKUP_FILE=nome_do_arquivo)
	@if [ -z "$(BACKUP_FILE)" ]; then echo "❌ Use: make restore BACKUP_FILE=backup_file.sql"; exit 1; fi
	docker-compose exec -T db psql -U comercio_user -d comercio_db < backup/$(BACKUP_FILE)

status: ## Verificar status dos serviços
	docker-compose ps

install: ## Instalação completa
	@echo "🚀 Instalando Sistema de Comércio Pro..."
	make build
	make up
	@echo "⏳ Aguardando serviços iniciarem..."
	sleep 30
	@echo ""
	@echo "✅ Sistema instalado com sucesso!"
	@echo ""
	@echo "🌐 Acessos:"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend API: http://localhost:8000/api/v1"
	@echo "   Documentação API: http://localhost:8000/api/docs"
	@echo "   Admin Django: http://localhost:8000/admin"
	@echo ""
	@echo "👤 Credenciais padrão:"
	@echo "   Usuário: admin"
	@echo "   Senha: admin123"
	@echo ""
	@echo "📋 Comandos úteis:"
	@echo "   make logs     - Ver logs dos serviços"
	@echo "   make status   - Verificar status"
	@echo "   make backup   - Fazer backup do banco"
	@echo "   make down     - Parar sistema"
	@echo ""

reset: ## Reset completo (CUIDADO: apaga todos os dados)
	@echo "⚠️  ATENÇÃO: Isso irá apagar TODOS os dados!"
	@read -p "Tem certeza? Digite 'reset' para confirmar: " confirm && [ "$confirm" = "reset" ]
	docker-compose down -v
	docker system prune -f
	make install

quick-start: ## Início rápido para desenvolvimento
	@echo "🚀 Início rápido..."
	make up
	@echo "⏳ Aguardando 15 segundos..."
	sleep 15
	@echo "✅ Sistema pronto!"

dev: ## Modo desenvolvimento
	docker-compose up

prod: ## Modo produção (usar docker-compose.prod.yml)
	@if [ ! -f docker-compose.prod.yml ]; then echo "❌ Arquivo docker-compose.prod.yml não encontrado"; exit 1; fi
	docker-compose -f docker-compose.prod.yml up -d
