#!/usr/bin/env python
"""
Script para popular o banco de dados com dados de teste
"""
import os
import sys
import django
from decimal import Decimal
from datetime import datetime, timedelta

# Setup Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'comercio.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.core.models import Loja, FormaPagamento
from apps.catalog.models import Categoria, Fornecedor, Produto, ProdutoCombo, ItemCombo, Promocao, ListaPreco
from apps.sales.models import SessaoPDV, Cliente

User = get_user_model()

def criar_usuarios():
    """Cria usuários de teste"""
    print("\n=== CRIANDO USUÁRIOS ===")

    # Admin
    if not User.objects.filter(username='admin').exists():
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@comerciopro.com',
            password='admin123',
            first_name='Administrador',
            last_name='Sistema'
        )
        print(f"✓ Admin criado: {admin.username}")

    # Gerente
    if not User.objects.filter(username='gerente').exists():
        gerente = User.objects.create_user(
            username='gerente',
            email='gerente@comerciopro.com',
            password='gerente123',
            first_name='João',
            last_name='Silva'
        )
        print(f"✓ Gerente criado: {gerente.username}")

    # Vendedor
    if not User.objects.filter(username='vendedor').exists():
        vendedor = User.objects.create_user(
            username='vendedor',
            email='vendedor@comerciopro.com',
            password='vendedor123',
            first_name='Maria',
            last_name='Santos'
        )
        print(f"✓ Vendedor criado: {vendedor.username}")

def criar_categorias():
    """Cria categorias de produtos"""
    print("\n=== CRIANDO CATEGORIAS ===")

    categorias = [
        {'nome': 'Bebidas', 'descricao': 'Bebidas em geral'},
        {'nome': 'Alimentos', 'descricao': 'Alimentos diversos'},
        {'nome': 'Higiene', 'descricao': 'Produtos de higiene pessoal'},
        {'nome': 'Limpeza', 'descricao': 'Produtos de limpeza'},
        {'nome': 'Snacks', 'descricao': 'Salgadinhos e petiscos'},
    ]

    for cat_data in categorias:
        cat, created = Categoria.objects.get_or_create(
            nome=cat_data['nome'],
            defaults={'descricao': cat_data['descricao']}
        )
        if created:
            print(f"✓ Categoria criada: {cat.nome}")

def criar_fornecedores():
    """Cria fornecedores"""
    print("\n=== CRIANDO FORNECEDORES ===")

    fornecedores = [
        {
            'nome': 'Coca-Cola FEMSA',
            'cnpj_cpf': '11222333000144',
            'telefone': '(11) 3333-4444',
            'email': 'vendas@cocacola.com.br'
        },
        {
            'nome': 'Ambev',
            'cnpj_cpf': '22333444000155',
            'telefone': '(11) 4444-5555',
            'email': 'vendas@ambev.com.br'
        },
        {
            'nome': 'Nestlé',
            'cnpj_cpf': '33444555000166',
            'telefone': '(11) 5555-6666',
            'email': 'vendas@nestle.com.br'
        },
    ]

    for forn_data in fornecedores:
        forn, created = Fornecedor.objects.get_or_create(
            cnpj_cpf=forn_data['cnpj_cpf'],
            defaults=forn_data
        )
        if created:
            print(f"✓ Fornecedor criado: {forn.nome}")

def criar_produtos():
    """Cria produtos"""
    print("\n=== CRIANDO PRODUTOS ===")

    bebidas = Categoria.objects.get(nome='Bebidas')
    alimentos = Categoria.objects.get(nome='Alimentos')
    snacks = Categoria.objects.get(nome='Snacks')

    coca_cola = Fornecedor.objects.get(nome='Coca-Cola FEMSA')
    ambev = Fornecedor.objects.get(nome='Ambev')
    nestle = Fornecedor.objects.get(nome='Nestlé')

    produtos = [
        {
            'sku': 'COCA2L001',
            'codigo_barras': '7894900011517',
            'nome': 'Coca-Cola 2L',
            'descricao': 'Refrigerante Coca-Cola 2 litros',
            'categoria': bebidas,
            'fornecedor': coca_cola,
            'preco_custo': Decimal('6.50'),
            'preco_venda': Decimal('9.99'),
            'estoque_minimo': 20,
            'unidade': 'UN'
        },
        {
            'sku': 'GUARA2L001',
            'codigo_barras': '7894900011524',
            'nome': 'Guaraná Antarctica 2L',
            'descricao': 'Refrigerante Guaraná Antarctica 2 litros',
            'categoria': bebidas,
            'fornecedor': ambev,
            'preco_custo': Decimal('5.50'),
            'preco_venda': Decimal('8.99'),
            'estoque_minimo': 20,
            'unidade': 'UN'
        },
        {
            'sku': 'AGUA500001',
            'codigo_barras': '7891000100103',
            'nome': 'Água Mineral 500ml',
            'descricao': 'Água mineral sem gás 500ml',
            'categoria': bebidas,
            'fornecedor': nestle,
            'preco_custo': Decimal('1.20'),
            'preco_venda': Decimal('2.50'),
            'estoque_minimo': 50,
            'unidade': 'UN'
        },
        {
            'sku': 'ARROZ5KG001',
            'codigo_barras': '7896024707390',
            'nome': 'Arroz Tipo 1 5kg',
            'descricao': 'Arroz branco tipo 1 pacote 5kg',
            'categoria': alimentos,
            'fornecedor': nestle,
            'preco_custo': Decimal('18.00'),
            'preco_venda': Decimal('26.90'),
            'estoque_minimo': 10,
            'unidade': 'UN'
        },
        {
            'sku': 'FEIJAO1KG001',
            'codigo_barras': '7896024707406',
            'nome': 'Feijão Preto 1kg',
            'descricao': 'Feijão preto tipo 1 pacote 1kg',
            'categoria': alimentos,
            'fornecedor': nestle,
            'preco_custo': Decimal('6.50'),
            'preco_venda': Decimal('9.90'),
            'estoque_minimo': 15,
            'unidade': 'UN'
        },
        {
            'sku': 'SALGAD150001',
            'codigo_barras': '7891000305508',
            'nome': 'Salgadinho Cheetos 150g',
            'descricao': 'Salgadinho sabor queijo 150g',
            'categoria': snacks,
            'fornecedor': nestle,
            'preco_custo': Decimal('4.50'),
            'preco_venda': Decimal('7.99'),
            'estoque_minimo': 30,
            'unidade': 'UN'
        },
    ]

    for prod_data in produtos:
        prod, created = Produto.objects.get_or_create(
            sku=prod_data['sku'],
            defaults=prod_data
        )
        if created:
            print(f"✓ Produto criado: {prod.nome} - R$ {prod.preco_venda}")

def criar_combos():
    """Cria combos de produtos"""
    print("\n=== CRIANDO COMBOS ===")

    coca = Produto.objects.get(sku='COCA2L001')
    salgadinho = Produto.objects.get(sku='SALGAD150001')
    agua = Produto.objects.get(sku='AGUA500001')

    # Combo 1: Coca + Salgadinho
    combo1, created = ProdutoCombo.objects.get_or_create(
        sku='COMBO001',
        defaults={
            'nome': 'Combo Refri + Salgadinho',
            'descricao': 'Coca-Cola 2L + Salgadinho Cheetos',
            'tipo': 'FIXO',
            'preco_combo': Decimal('15.90'),
            'ativo': True
        }
    )
    if created:
        ItemCombo.objects.create(
            combo=combo1,
            produto=coca,
            quantidade=1,
            ordem=1
        )
        ItemCombo.objects.create(
            combo=combo1,
            produto=salgadinho,
            quantidade=1,
            ordem=2
        )
        print(f"✓ Combo criado: {combo1.nome} - R$ {combo1.preco_combo}")

    # Combo 2: 2 Águas
    combo2, created = ProdutoCombo.objects.get_or_create(
        sku='COMBO002',
        defaults={
            'nome': 'Combo 2 Águas',
            'descricao': 'Duas águas minerais 500ml',
            'tipo': 'FIXO',
            'preco_combo': Decimal('4.50'),
            'ativo': True
        }
    )
    if created:
        ItemCombo.objects.create(
            combo=combo2,
            produto=agua,
            quantidade=2,
            ordem=1
        )
        print(f"✓ Combo criado: {combo2.nome} - R$ {combo2.preco_combo}")

def criar_promocoes():
    """Cria promoções"""
    print("\n=== CRIANDO PROMOÇÕES ===")

    hoje = datetime.now()
    daqui_30_dias = hoje + timedelta(days=30)

    agua = Produto.objects.get(sku='AGUA500001')

    promo, created = Promocao.objects.get_or_create(
        nome='Promoção Água Mineral',
        defaults={
            'tipo': 'DESCONTO_PERCENTUAL',
            'valor': Decimal('20.00'),
            'data_inicio': hoje,
            'data_fim': daqui_30_dias,
            'quantidade_minima': 1,
            'ativo': True
        }
    )
    if created:
        promo.produtos.add(agua)
        print(f"✓ Promoção criada: {promo.nome} - {promo.valor}% OFF")

def criar_listas_preco():
    """Cria listas de preço"""
    print("\n=== CRIANDO LISTAS DE PREÇO ===")

    lista, created = ListaPreco.objects.get_or_create(
        nome='Preços de Atacado',
        defaults={
            'tipo': 'ATACADO',
            'descricao': 'Preços especiais para compras em grande quantidade',
            'percentual_desconto': Decimal('15.00'),
            'ativo': True
        }
    )
    if created:
        print(f"✓ Lista de preço criada: {lista.nome}")

def criar_clientes():
    """Cria clientes"""
    print("\n=== CRIANDO CLIENTES ===")

    clientes_data = [
        {
            'nome': 'João da Silva',
            'cpf': '12345678900',
            'telefone': '(11) 98765-4321',
            'email': 'joao.silva@email.com'
        },
        {
            'nome': 'Maria Oliveira',
            'cpf': '98765432100',
            'telefone': '(11) 91234-5678',
            'email': 'maria.oliveira@email.com'
        },
    ]

    for cli_data in clientes_data:
        cli, created = Cliente.objects.get_or_create(
            cpf=cli_data['cpf'],
            defaults=cli_data
        )
        if created:
            print(f"✓ Cliente criado: {cli.nome}")

def main():
    print("=" * 60)
    print("INICIANDO POPULAÇÃO DO BANCO DE DADOS")
    print("=" * 60)

    try:
        criar_usuarios()
        criar_categorias()
        criar_fornecedores()
        criar_produtos()
        # criar_combos()  # Tabela não existe ainda
        # criar_promocoes()  # Tabela não existe ainda
        # criar_listas_preco()  # Tabela não existe ainda
        criar_clientes()

        print("\n" + "=" * 60)
        print("✓ BANCO DE DADOS POPULADO COM SUCESSO!")
        print("=" * 60)

        print("\n=== CREDENCIAIS DE ACESSO ===")
        print("Admin:")
        print("  Username: admin")
        print("  Password: admin123")
        print("\nGerente:")
        print("  Username: gerente")
        print("  Password: gerente123")
        print("\nVendedor:")
        print("  Username: vendedor")
        print("  Password: vendedor123")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ ERRO: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
