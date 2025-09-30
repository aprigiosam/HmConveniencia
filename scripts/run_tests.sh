#!/bin/bash

# Script completo para executar todos os testes do projeto
# Uso: ./scripts/run_tests.sh [--coverage] [--frontend-only] [--backend-only]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
COVERAGE=false
FRONTEND_ONLY=false
BACKEND_ONLY=false

# Parse argumentos
for arg in "$@"; do
    case $arg in
        --coverage)
            COVERAGE=true
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        *)
            echo "Uso: $0 [--coverage] [--frontend-only] [--backend-only]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🧪 Iniciando execução completa dos testes${NC}"
echo "=================================================="

# Função para executar comando e capturar status
run_command() {
    local cmd="$1"
    local description="$2"

    echo -e "\n${YELLOW}▶ $description${NC}"

    if eval "$cmd"; then
        echo -e "${GREEN}✅ $description - SUCESSO${NC}"
        return 0
    else
        echo -e "${RED}❌ $description - FALHOU${NC}"
        return 1
    fi
}

# Função para executar testes do backend
run_backend_tests() {
    echo -e "\n${BLUE}🐍 Executando testes do Backend (Django)${NC}"
    echo "----------------------------------------"

    cd backend

    # Verifica se o ambiente virtual está ativo
    if [[ "$VIRTUAL_ENV" == "" ]]; then
        echo -e "${YELLOW}⚠️  Ativando ambiente virtual...${NC}"
        source venv/bin/activate || {
            echo -e "${RED}❌ Erro: ambiente virtual não encontrado em backend/venv${NC}"
            echo "Execute: cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
            exit 1
        }
    fi

    # Instala dependências se necessário
    run_command "pip install -q -r requirements.txt" "Instalando dependências do backend"

    # Executa migrações para teste
    run_command "python manage.py migrate --settings=comercio.settings" "Executando migrações"

    # Testa se o servidor consegue iniciar
    run_command "python manage.py check --settings=comercio.settings" "Verificando configurações do Django"

    # Executa testes
    if [[ "$COVERAGE" == true ]]; then
        echo -e "\n${YELLOW}📊 Executando testes com coverage...${NC}"
        run_command "coverage run --source='.' manage.py test --keepdb --parallel auto" "Testes Django com coverage"
        run_command "coverage report -m" "Relatório de coverage"
        run_command "coverage html" "Gerando relatório HTML de coverage"
        echo -e "${GREEN}📊 Relatório de coverage disponível em: backend/htmlcov/index.html${NC}"
    else
        run_command "python manage.py test --keepdb --parallel auto" "Testes Django"
    fi

    cd ..
}

# Função para executar testes do frontend
run_frontend_tests() {
    echo -e "\n${BLUE}⚛️  Executando testes do Frontend (React/Vitest)${NC}"
    echo "----------------------------------------"

    cd frontend

    # Instala dependências se necessário
    if [[ ! -d "node_modules" ]]; then
        run_command "npm install" "Instalando dependências do frontend"
    fi

    # Executa lint
    run_command "npm run lint" "ESLint"

    # Executa type check
    run_command "npm run build" "Type checking e build"

    # Executa testes
    if [[ "$COVERAGE" == true ]]; then
        echo -e "\n${YELLOW}📊 Executando testes com coverage...${NC}"
        run_command "npm run test -- --coverage" "Testes Vitest com coverage"
    else
        run_command "npm test" "Testes Vitest"
    fi

    cd ..
}

# Função para executar testes de integração
run_integration_tests() {
    echo -e "\n${BLUE}🔗 Executando testes de integração${NC}"
    echo "----------------------------------------"

    # Verifica se os serviços estão rodando
    echo -e "${YELLOW}🔍 Verificando se os serviços estão disponíveis...${NC}"

    # Test health endpoint
    if curl -s http://localhost:8000/api/v1/health/ > /dev/null; then
        echo -e "${GREEN}✅ Backend está rodando${NC}"

        # Testa endpoints principais
        run_command "curl -s -f http://localhost:8000/api/v1/monitoring/metrics/" "Endpoint de métricas"
        run_command "curl -s -f http://localhost:8000/api/v1/monitoring/status/" "Endpoint de status"

    else
        echo -e "${YELLOW}⚠️  Backend não está rodando. Iniciando com Docker...${NC}"
        run_command "docker compose up -d backend db redis" "Iniciando serviços com Docker"

        # Espera o backend ficar pronto
        echo -e "${YELLOW}⏳ Aguardando backend ficar pronto...${NC}"
        for i in {1..30}; do
            if curl -s http://localhost:8000/api/v1/health/ > /dev/null; then
                echo -e "${GREEN}✅ Backend está pronto!${NC}"
                break
            fi
            echo -n "."
            sleep 2
        done
    fi

    # Test frontend
    if curl -s http://localhost:3000 > /dev/null; then
        echo -e "${GREEN}✅ Frontend está rodando${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend não detectado (OK se não estiver em desenvolvimento)${NC}"
    fi
}

# Execução principal
main() {
    local start_time=$(date +%s)
    local failed_tests=0

    echo -e "${BLUE}🚀 Comércio Pro - Suite de Testes${NC}"
    echo -e "${YELLOW}Configuração:${NC}"
    echo "  Coverage: $COVERAGE"
    echo "  Frontend only: $FRONTEND_ONLY"
    echo "  Backend only: $BACKEND_ONLY"
    echo ""

    # Executa testes conforme configuração
    if [[ "$FRONTEND_ONLY" == false ]]; then
        if ! run_backend_tests; then
            failed_tests=$((failed_tests + 1))
        fi
    fi

    if [[ "$BACKEND_ONLY" == false ]]; then
        if ! run_frontend_tests; then
            failed_tests=$((failed_tests + 1))
        fi
    fi

    # Testes de integração apenas se ambos os tipos foram executados
    if [[ "$FRONTEND_ONLY" == false && "$BACKEND_ONLY" == false ]]; then
        if ! run_integration_tests; then
            failed_tests=$((failed_tests + 1))
        fi
    fi

    # Relatório final
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo "=================================================="
    if [[ $failed_tests -eq 0 ]]; then
        echo -e "${GREEN}🎉 TODOS OS TESTES PASSARAM! 🎉${NC}"
        echo -e "${GREEN}✅ Tempo total: ${duration}s${NC}"

        # Dicas úteis
        echo ""
        echo -e "${BLUE}💡 Próximos passos:${NC}"
        echo "  • Execute 'make up' para iniciar o sistema completo"
        echo "  • Acesse http://localhost:3000 para o frontend"
        echo "  • Acesse http://localhost:8000/api/docs para a documentação da API"
        echo "  • Acesse http://localhost:8000/api/v1/monitoring/metrics/ para métricas"

        if [[ "$COVERAGE" == true ]]; then
            echo ""
            echo -e "${BLUE}📊 Relatórios de coverage:${NC}"
            echo "  • Backend: backend/htmlcov/index.html"
            echo "  • Frontend: frontend/coverage/index.html"
        fi

        exit 0
    else
        echo -e "${RED}❌ $failed_tests teste(s) falharam${NC}"
        echo -e "${RED}⏱️  Tempo total: ${duration}s${NC}"
        echo ""
        echo -e "${YELLOW}💡 Para debugar:${NC}"
        echo "  • Verifique os logs acima"
        echo "  • Execute os testes individualmente"
        echo "  • Backend: cd backend && python manage.py test"
        echo "  • Frontend: cd frontend && npm test"
        exit 1
    fi
}

# Executa função principal
main