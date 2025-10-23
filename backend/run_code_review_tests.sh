#!/bin/bash

# Script para executar testes das correções do code review
# Usage: ./run_code_review_tests.sh

set -e

echo "======================================"
echo "🧪 Executando Testes - Code Review Fixes"
echo "======================================"
echo ""

# Define variáveis de ambiente
export DEBUG=False
export SECRET_KEY='test-secret-key-local'
export DATABASE_URL='sqlite:///db_test.sqlite3'

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 1. Testando calcular_total() - N+1 Query Fix${NC}"
python3 manage.py test core.tests.test_code_review_fixes.VendaCalcularTotalTestCase --verbosity=2
echo -e "${GREEN}✅ Teste calcular_total() passou!${NC}"
echo ""

echo -e "${BLUE}📋 2. Testando cancelamento de venda com lotes${NC}"
python3 manage.py test core.tests.test_code_review_fixes.CancelamentoVendaComLotesTestCase --verbosity=2
echo -e "${GREEN}✅ Teste cancelamento com lotes passou!${NC}"
echo ""

echo -e "${BLUE}📋 3. Testando unique constraint multi-tenant${NC}"
python3 manage.py test core.tests.test_code_review_fixes.CategoriaUniqueConstraintTestCase --verbosity=2
echo -e "${GREEN}✅ Teste unique constraint passou!${NC}"
echo ""

echo -e "${BLUE}📋 4. Testando otimização ClienteSerializer${NC}"
python3 manage.py test core.tests.test_code_review_fixes.ClienteSerializerOptimizationTestCase --verbosity=2
echo -e "${GREEN}✅ Teste ClienteSerializer passou!${NC}"
echo ""

echo -e "${BLUE}📋 5. Testando DEBUG=False por padrão${NC}"
python3 manage.py test core.tests.test_code_review_fixes.DEBUGSettingsTestCase --verbosity=2
echo -e "${GREEN}✅ Teste DEBUG settings passou!${NC}"
echo ""

echo -e "${BLUE}📋 6. Testando dashboard com transaction${NC}"
python3 manage.py test core.tests.test_code_review_fixes.DashboardTransactionTestCase --verbosity=2
echo -e "${GREEN}✅ Teste dashboard transaction passou!${NC}"
echo ""

echo -e "${BLUE}📋 7. Testando geração de número de venda${NC}"
python3 manage.py test core.tests.test_code_review_fixes.VendaNumeroGenerationTestCase --verbosity=2
echo -e "${GREEN}✅ Teste geração de número passou!${NC}"
echo ""

echo ""
echo "======================================"
echo -e "${GREEN}✅ TODOS OS TESTES PASSARAM!${NC}"
echo "======================================"
echo ""
echo "📊 Resumo:"
echo "  - N+1 Query Fix: ✅"
echo "  - Cancelamento com Lotes: ✅"
echo "  - Unique Constraint Multi-tenant: ✅"
echo "  - ClienteSerializer Otimizado: ✅"
echo "  - DEBUG=False: ✅"
echo "  - Dashboard Transaction: ✅"
echo "  - Número de Venda Único: ✅"
echo ""
