#!/usr/bin/env python
"""
Script para carregar dados iniciais do sistema
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'comercio.settings')
django.setup()

from apps.core.models import Loja, Cliente, FormaPagamento
from apps.catalog.models import Categoria, Fornecedor, Produto, LoteProduto

def criar_loja():
    """Criar loja principal"""
    loja, created = Loja.objects.get_or_create(
        cnpj='12.345.678/0001-00',
        defaults={
            'nome': 'Loja Principal',
            'endereco': {
                'logradouro': 'Rua do Comércio, 123',
                'bairro': 'Centro',
                'cidade': 'São Paulo',
                'uf': 'SP',
                'cep': '01000-000'
            },
            'telefone': '(11) 99999-9999',
            'email': 'contato@loja.com',
            'ativo': True
        }
    )
    if created:
        print('✅ Loja principal criada')
    return loja

def criar_formas_pagamento():
    """Criar formas de pagamento"""
    formas = [
        {'nome': 'Dinheiro', 'tipo': 'DINHEIRO', 'taxa': 0, 'prazo_recebimento': 0},
        {'nome': 'Cartão de Débito', 'tipo': 'DEBITO', 'taxa': 2.5, 'prazo_recebimento': 1},
        {'nome': 'Cartão de Crédito', 'tipo': 'CREDITO', 'taxa': 3.5, 'prazo_recebimento': 30},
        {'nome': 'PIX', 'tipo': 'PIX', 'taxa': 0, 'prazo_recebimento': 0},
        {'nome': 'Transferência', 'tipo': 'TRANSFERENCIA', 'taxa': 0, 'prazo_recebimento': 1},
    ]
    
    count = 0
    for forma_data in formas:
        forma, created = FormaPagamento.objects.get_or_create(
            nome=forma_data['nome'],
            defaults=forma_data
        )
        if created:
            count += 1
    
    print(f'✅ {count} formas de pagamento criadas')

def criar_categorias():
    """Criar categorias"""
    # Categoria principal
    alimentacao, _ = Categoria.objects.get_or_create(
        nome='Alimentação',
        defaults={'descricao': 'Produtos alimentícios em geral'}
    )
    
    # Subcategorias
    categorias = [
        {'nome': 'Bebidas', 'categoria_pai': alimentacao, 'descricao': 'Refrigerantes, sucos, águas'},
        {'nome': 'Laticínios', 'categoria_pai': alimentacao, 'descricao': 'Leite, iogurte, queijos'},
        {'nome': 'Higiene', 'categoria_pai': None, 'descricao': 'Produtos de higiene pessoal'},
        {'nome': 'Limpeza', 'categoria_pai': None, 'descricao': 'Produtos de limpeza doméstica'},
    ]
    
    count = 1  # alimentacao já criada
    for cat_data in categorias:
        categoria, created = Categoria.objects.get_or_create(
            nome=cat_data['nome'],
            defaults=cat_data
        )
        if created:
            count += 1
    
    print(f'✅ {count} categorias criadas')
    return {
        'alimentacao': alimentacao,
        'bebidas': Categoria.objects.get(nome='Bebidas'),
        'laticinios': Categoria.objects.get(nome='Laticínios'),
        'higiene': Categoria.objects.get(nome='Higiene'),
        'limpeza': Categoria.objects.get(nome='Limpeza'),
    }

def criar_fornecedor():
    """Criar fornecedor"""
    fornecedor, created = Fornecedor.objects.get_or_create(
        cnpj_cpf='98.765.432/0001-00',
        defaults={
            'nome': 'Distribuidora Central',
            'telefone': '(11) 88888-8888',
            'email': 'vendas@distribuidora.com',
            'endereco': {
                'logradouro': 'Av. Industrial, 500',
                'bairro': 'Industrial',
                'cidade': 'São Paulo',
                'uf': 'SP',
                'cep': '02000-000'
            },
            'ativo': True
        }
    )
    if created:
        print('✅ Fornecedor criado')
    return fornecedor

def criar_produtos(categorias, fornecedor):
    """Criar produtos de demonstração"""
    produtos_data = [
        {
            'sku': 'COCA001',
            'codigo_barras': '7894900011517',
            'nome': 'Coca-Cola 350ml',
            'descricao': 'Refrigerante Coca-Cola lata 350ml',
            'categoria': categorias['bebidas'],
            'preco_custo': Decimal('2.50'),
            'preco_venda': Decimal('4.50'),
            'estoque_minimo': 24,
            'controla_vencimento': False,
        },
        {
            'sku': 'AGUA001',
            'codigo_barras': '7891234567890',
            'nome': 'Água Mineral 500ml',
            'descricao': 'Água mineral natural 500ml',
            'categoria': categorias['bebidas'],
            'preco_custo': Decimal('1.00'),
            'preco_venda': Decimal('2.00'),
            'estoque_minimo': 48,
            'controla_vencimento': False,
        },
        {
            'sku': 'SABO001',
            'codigo_barras': '7891234567891',
            'nome': 'Sabonete Dove 90g',
            'descricao': 'Sabonete em barra Dove 90g',
            'categoria': categorias['higiene'],
            'preco_custo': Decimal('3.00'),
            'preco_venda': Decimal('5.50'),
            'estoque_minimo': 12,
            'controla_vencimento': False,
        },
        {
            'sku': 'IOGUR001',
            'codigo_barras': '7891234567892',
            'nome': 'Iogurte Natural 170g',
            'descricao': 'Iogurte natural integral 170g',
            'categoria': categorias['laticinios'],
            'preco_custo': Decimal('2.00'),
            'preco_venda': Decimal('3.50'),
            'estoque_minimo': 20,
            'controla_vencimento': True,
            'dias_alerta_vencimento': 5,
            'permite_venda_vencido': True,
            'desconto_produto_vencido': Decimal('30.00'),
        },
        {
            'sku': 'LEITE001',
            'codigo_barras': '7891234567893',
            'nome': 'Leite Integral 1L',
            'descricao': 'Leite integral longa vida 1 litro',
            'categoria': categorias['laticinios'],
            'preco_custo': Decimal('3.50'),
            'preco_venda': Decimal('5.50'),
            'estoque_minimo': 15,
            'controla_vencimento': True,
            'dias_alerta_vencimento': 10,
            'permite_venda_vencido': False,
            'desconto_produto_vencido': Decimal('0.00'),
        },
    ]
    
    count = 0
    produtos_criados = []
    
    for produto_data in produtos_data:
        produto_data['fornecedor'] = fornecedor
        produto_data['unidade'] = 'UN'
        produto_data['ativo'] = True
        
        produto, created = Produto.objects.get_or_create(
            sku=produto_data['sku'],
            defaults=produto_data
        )
        
        if created:
            count += 1
            produtos_criados.append(produto)
    
    print(f'✅ {count} produtos criados')
    return produtos_criados

def criar_lotes_demonstracao(produtos, loja):
    """Criar lotes de demonstração para produtos com vencimento"""
    count = 0
    hoje = timezone.now().date()
    
    for produto in produtos:
        if produto.controla_vencimento:
            # Lote vencido (para demonstração)
            lote_vencido, created = LoteProduto.objects.get_or_create(
                produto=produto,
                loja=loja,
                numero_lote=f'VENCIDO-{produto.sku}',
                defaults={
                    'data_vencimento': hoje - timedelta(days=5),
                    'quantidade': 10,
                    'custo_unitario': produto.preco_custo
                }
            )
            if created:
                count += 1
            
            # Lote vencendo em breve
            lote_vencendo, created = LoteProduto.objects.get_or_create(
                produto=produto,
                loja=loja,
                numero_lote=f'VENCENDO-{produto.sku}',
                defaults={
                    'data_vencimento': hoje + timedelta(days=3),
                    'quantidade': 25,
                    'custo_unitario': produto.preco_custo
                }
            )
            if created:
                count += 1
            
            # Lote no prazo
            lote_ok, created = LoteProduto.objects.get_or_create(
                produto=produto,
                loja=loja,
                numero_lote=f'OK-{produto.sku}',
                defaults={
                    'data_vencimento': hoje + timedelta(days=60),
                    'quantidade': 100,
                    'custo_unitario': produto.preco_custo
                }
            )
            if created:
                count += 1
    
    print(f'✅ {count} lotes de demonstração criados')

def criar_cliente_padrao():
    """Criar cliente padrão"""
    cliente, created = Cliente.objects.get_or_create(
        cpf='123.456.789-00',
        defaults={
            'nome': 'Cliente Padrão',
            'telefone': '(11) 77777-7777',
            'email': 'cliente@email.com',
            'endereco': {
                'logradouro': 'Rua do Cliente, 456',
                'bairro': 'Residencial',
                'cidade': 'São Paulo',
                'uf': 'SP',
                'cep': '03000-000'
            },
            'pontos_fidelidade': 0,
            'ativo': True
        }
    )
    if created:
        print('✅ Cliente padrão criado')

def main():
    """Função principal"""
    print('📦 Carregando dados iniciais do sistema...')
    
    try:
        # Criar dados básicos
        loja = criar_loja()
        criar_formas_pagamento()
        categorias = criar_categorias()
        fornecedor = criar_fornecedor()
        produtos = criar_produtos(categorias, fornecedor)
        criar_lotes_demonstracao(produtos, loja)
        criar_cliente_padrao()
        
        print('🎉 Dados iniciais carregados com sucesso!')
        
    except Exception as e:
        print(f'❌ Erro ao carregar dados: {e}')
        raise

if __name__ == '__main__':
    main()
