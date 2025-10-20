-- =====================================================
-- SCRIPT PARA ADICIONAR ÍNDICES DE PERFORMANCE
-- Execute via DBeaver no banco PostgreSQL do Render
-- =====================================================
-- Tempo estimado: 2-5 minutos (depende da quantidade de dados)
-- Pode executar tudo de uma vez ou um por vez
-- =====================================================

-- ========== VENDA (4 índices) ==========
-- Dashboard e queries principais
CREATE INDEX CONCURRENTLY IF NOT EXISTS venda_status_idx
    ON core_venda (status, status_pagamento, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS venda_status_date_idx
    ON core_venda (status, created_at DESC);

-- Contas a receber
CREATE INDEX CONCURRENTLY IF NOT EXISTS venda_cliente_pag_idx
    ON core_venda (cliente_id, status_pagamento, data_vencimento);

-- Relatórios por forma de pagamento
CREATE INDEX CONCURRENTLY IF NOT EXISTS venda_forma_pag_idx
    ON core_venda (forma_pagamento, status, created_at DESC);


-- ========== ITEMVENDA (2 índices) ==========
-- Joins otimizados
CREATE INDEX CONCURRENTLY IF NOT EXISTS itemvenda_vp_idx
    ON core_itemvenda (venda_id, produto_id);

-- Agregações por produto
CREATE INDEX CONCURRENTLY IF NOT EXISTS itemvenda_produto_idx
    ON core_itemvenda (produto_id);


-- ========== PRODUTO (3 índices) ==========
-- Alertas de estoque baixo
CREATE INDEX CONCURRENTLY IF NOT EXISTS produto_ativo_estoque_idx
    ON core_produto (ativo, estoque);

-- Alertas de vencimento
CREATE INDEX CONCURRENTLY IF NOT EXISTS produto_validade_idx
    ON core_produto (ativo, data_validade);

-- Buscas por categoria
CREATE INDEX CONCURRENTLY IF NOT EXISTS produto_categoria_idx
    ON core_produto (categoria_id, ativo);


-- ========== CLIENTE (1 índice) ==========
-- Listagens e buscas
CREATE INDEX CONCURRENTLY IF NOT EXISTS cliente_ativo_nome_idx
    ON core_cliente (ativo, nome);


-- ========== CAIXA (1 índice) ==========
-- Busca caixa aberto
CREATE INDEX CONCURRENTLY IF NOT EXISTS caixa_status_idx
    ON core_caixa (status, data_abertura DESC);


-- =====================================================
-- VERIFICAR ÍNDICES CRIADOS
-- =====================================================
-- Execute este comando para ver todos os índices:
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename LIKE 'core_%'
ORDER BY tablename, indexname;


-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. CONCURRENTLY: Não trava a tabela durante criação
-- 2. IF NOT EXISTS: Não dá erro se índice já existe
-- 3. Pode executar tudo de uma vez (copy/paste)
-- 4. Se algum índice falhar, os outros continuam
-- =====================================================
