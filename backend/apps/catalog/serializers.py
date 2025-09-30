"""
Serializers consolidados do catálogo
Inclui: Produtos, Categorias, Fornecedores, Combos, Favoritos, Preços
"""

from decimal import Decimal
from rest_framework import serializers
from .models import (
    Categoria, Fornecedor, Produto, LoteProduto,
    ProdutoCombo, ItemCombo, OpcaoSubstituicao,
    ProdutoComposto, IngredienteComposto,
    ProdutoFavorito, GridProdutoPDV, ItemGridPDV,
    ListaPreco, ItemListaPreco, Promocao, UsoPromocao
)


# ========================================
# PRODUTOS BÁSICOS
# ========================================

class CategoriaSerializer(serializers.ModelSerializer):
    subcategorias_count = serializers.SerializerMethodField()
    produtos_count = serializers.SerializerMethodField()

    class Meta:
        model = Categoria
        fields = '__all__'

    def get_subcategorias_count(self, obj):
        return obj.subcategorias.count()

    def get_produtos_count(self, obj):
        return obj.produtos.count()


class FornecedorSerializer(serializers.ModelSerializer):
    produtos_ativos = serializers.IntegerField(read_only=True)
    estoque_total = serializers.IntegerField(read_only=True)
    valor_estoque = serializers.DecimalField(read_only=True, max_digits=12, decimal_places=2)

    class Meta:
        model = Fornecedor
        fields = [
            'id', 'cnpj_cpf', 'nome', 'telefone', 'email', 'responsavel',
            'contatos', 'condicoes_pagamento', 'prazo_medio_entrega_dias',
            'observacoes', 'endereco', 'ativo', 'created_at', 'updated_at',
            'produtos_ativos', 'estoque_total', 'valor_estoque',
        ]

    def validate_contatos(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Formato inválido, envie uma lista de contatos.")
        contatos_norm = []
        for contato in value:
            if not isinstance(contato, dict):
                raise serializers.ValidationError("Cada contato deve ser um objeto.")
            contatos_norm.append({
                "nome": contato.get("nome", ""),
                "telefone": contato.get("telefone", ""),
                "email": contato.get("email", ""),
                "observacao": contato.get("observacao", ""),
            })
        return contatos_norm


class LoteProdutoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    loja_nome = serializers.CharField(source='loja.nome', read_only=True)

    class Meta:
        model = LoteProduto
        fields = '__all__'


class ProdutoSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    fornecedor_nome = serializers.CharField(source='fornecedor.nome', read_only=True)
    lotes = LoteProdutoSerializer(many=True, read_only=True)
    estoque_total = serializers.SerializerMethodField()
    margem_lucro = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = [
            'id', 'sku', 'codigo_barras', 'nome', 'descricao',
            'categoria', 'categoria_nome', 'fornecedor', 'fornecedor_nome',
            'unidade', 'preco_custo', 'preco_venda', 'estoque_minimo',
            'controla_vencimento', 'dias_alerta_vencimento',
            'permite_venda_vencido', 'desconto_produto_vencido',
            'ativo', 'created_at', 'updated_at', 'lotes',
            'estoque_total', 'margem_lucro'
        ]

    def get_estoque_total(self, obj):
        return sum(lote.quantidade for lote in obj.lotes.all())

    def get_margem_lucro(self, obj):
        if obj.preco_custo > 0:
            return round(((obj.preco_venda - obj.preco_custo) / obj.preco_custo) * 100, 2)
        return 0.0

    def validate_sku(self, value):
        if self.instance and self.instance.sku == value:
            return value
        if Produto.objects.filter(sku=value).exists():
            raise serializers.ValidationError("SKU ja existe.")
        return value

    def validate_codigo_barras(self, value):
        if self.instance and self.instance.codigo_barras == value:
            return value
        if Produto.objects.filter(codigo_barras=value).exists():
            raise serializers.ValidationError("Codigo de barras ja existe.")
        return value

    def validate(self, data):
        if data.get('preco_venda', 0) < data.get('preco_custo', 0):
            raise serializers.ValidationError("Preco de venda nao pode ser menor que o preco de custo.")
        return data


class ProdutoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem"""
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    fornecedor_nome = serializers.CharField(source='fornecedor.nome', read_only=True)
    estoque_total = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = [
            'id', 'sku', 'codigo_barras', 'nome', 'categoria_nome',
            'fornecedor_nome', 'preco_venda', 'estoque_total', 'ativo'
        ]

    def get_estoque_total(self, obj):
        return sum(lote.quantidade for lote in obj.lotes.all())


class ProdutoComLoteSerializer(serializers.ModelSerializer):
    """Serializer para criar produto com lote inicial"""
    lote_inicial = serializers.DictField(required=False, write_only=True)

    class Meta:
        model = Produto
        fields = [
            'id', 'sku', 'codigo_barras', 'nome', 'descricao',
            'categoria', 'fornecedor', 'unidade', 'preco_custo', 'preco_venda',
            'estoque_minimo', 'controla_vencimento', 'dias_alerta_vencimento',
            'permite_venda_vencido', 'desconto_produto_vencido', 'ativo',
            'lote_inicial'
        ]

    def validate_lote_inicial(self, value):
        if not value:
            return value
        required_fields = ['numero_lote', 'quantidade']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Campo {field} é obrigatório")
        if value['quantidade'] <= 0:
            raise serializers.ValidationError("Quantidade deve ser maior que zero")
        return value

    def create(self, validated_data):
        from apps.core.models import Loja
        from apps.inventory.models import MovimentacaoEstoque
        from django.db import transaction

        lote_data = validated_data.pop('lote_inicial', None)

        with transaction.atomic():
            produto = super().create(validated_data)

            if lote_data:
                loja = Loja.objects.first()
                if not loja:
                    raise serializers.ValidationError("Nenhuma loja encontrada")

                lote = LoteProduto.objects.create(
                    produto=produto,
                    loja=loja,
                    numero_lote=lote_data['numero_lote'],
                    data_vencimento=lote_data.get('data_vencimento'),
                    quantidade=lote_data['quantidade'],
                    custo_unitario=lote_data.get('custo_unitario', produto.preco_custo)
                )

                MovimentacaoEstoque.objects.create(
                    loja=loja,
                    produto=produto,
                    lote=lote,
                    tipo=MovimentacaoEstoque.Tipo.ENTRADA,
                    quantidade=lote_data['quantidade'],
                    quantidade_anterior=0,
                    motivo="Entrada inicial - Cadastro de produto",
                    observacoes=f"Lote {lote_data['numero_lote']} criado automaticamente"
                )

        return produto


# ========================================
# COMBOS E PRODUTOS COMPOSTOS
# ========================================

class OpcaoSubstituicaoSerializer(serializers.ModelSerializer):
    produto_substituto_dados = ProdutoSerializer(source='produto_substituto', read_only=True)

    class Meta:
        model = OpcaoSubstituicao
        fields = ['id', 'produto_substituto', 'produto_substituto_dados', 'acrescimo_preco']


class ItemComboSerializer(serializers.ModelSerializer):
    produto_dados = ProdutoSerializer(source='produto', read_only=True)
    opcoes_substituicao = OpcaoSubstituicaoSerializer(many=True, read_only=True)
    preco_unitario = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItemCombo
        fields = [
            'id', 'produto', 'produto_dados', 'quantidade',
            'opcional', 'substituivel', 'opcoes_substituicao',
            'preco_unitario', 'subtotal', 'ordem'
        ]

    def get_preco_unitario(self, obj):
        return float(obj.produto.preco_venda)

    def get_subtotal(self, obj):
        return float(obj.produto.preco_venda * obj.quantidade)


class ProdutoComboSerializer(serializers.ModelSerializer):
    itens = ItemComboSerializer(many=True, read_only=True)
    total_itens = serializers.SerializerMethodField()
    economia = serializers.SerializerMethodField()
    disponivel = serializers.SerializerMethodField()

    class Meta:
        model = ProdutoCombo
        fields = [
            'id', 'nome', 'descricao', 'sku', 'tipo',
            'preco_combo', 'preco_original', 'desconto_percentual',
            'imagem', 'ativo', 'estoque_minimo', 'ordem_exibicao',
            'itens', 'total_itens', 'economia', 'disponivel', 'created_at'
        ]
        read_only_fields = ['preco_original', 'desconto_percentual']

    def get_total_itens(self, obj):
        return obj.itens.count()

    def get_economia(self, obj):
        return float(obj.preco_original - obj.preco_combo)

    def get_disponivel(self, obj):
        disponivel, motivo = obj.verificar_disponibilidade()
        return {'disponivel': disponivel, 'motivo': motivo if not disponivel else None}


class ProdutoComboCreateSerializer(serializers.ModelSerializer):
    itens = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)

    class Meta:
        model = ProdutoCombo
        fields = [
            'nome', 'descricao', 'sku', 'tipo', 'preco_combo',
            'imagem', 'ativo', 'estoque_minimo', 'ordem_exibicao', 'itens'
        ]

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])
        combo = ProdutoCombo.objects.create(**validated_data)
        for item_data in itens_data:
            ItemCombo.objects.create(
                combo=combo,
                produto_id=item_data['produto_id'],
                quantidade=Decimal(str(item_data.get('quantidade', 1))),
                opcional=item_data.get('opcional', False),
                substituivel=item_data.get('substituivel', False),
                ordem=item_data.get('ordem', 0)
            )
        combo.atualizar_calculos()
        return combo

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if itens_data is not None:
            instance.itens.all().delete()
            for item_data in itens_data:
                ItemCombo.objects.create(
                    combo=instance,
                    produto_id=item_data['produto_id'],
                    quantidade=Decimal(str(item_data.get('quantidade', 1))),
                    opcional=item_data.get('opcional', False),
                    substituivel=item_data.get('substituivel', False),
                    ordem=item_data.get('ordem', 0)
                )
            instance.atualizar_calculos()
        return instance


class IngredienteCompostoSerializer(serializers.ModelSerializer):
    produto_ingrediente_dados = ProdutoSerializer(source='produto_ingrediente', read_only=True)
    custo_ingrediente = serializers.SerializerMethodField()

    class Meta:
        model = IngredienteComposto
        fields = [
            'id', 'produto_ingrediente', 'produto_ingrediente_dados',
            'quantidade', 'unidade', 'custo_ingrediente', 'ordem'
        ]

    def get_custo_ingrediente(self, obj):
        return float(obj.produto_ingrediente.preco_custo * obj.quantidade)


class ProdutoCompostoSerializer(serializers.ModelSerializer):
    produto_final_dados = ProdutoSerializer(source='produto_final', read_only=True)
    ingredientes = IngredienteCompostoSerializer(many=True, read_only=True)
    custo_total = serializers.SerializerMethodField()
    margem_lucro = serializers.SerializerMethodField()
    estoque_disponivel = serializers.SerializerMethodField()

    class Meta:
        model = ProdutoComposto
        fields = [
            'id', 'produto_final', 'produto_final_dados',
            'descricao_producao', 'tempo_preparo', 'custo_adicional',
            'ingredientes', 'custo_total', 'margem_lucro',
            'estoque_disponivel', 'created_at'
        ]

    def get_custo_total(self, obj):
        return float(obj.calcular_custo_total())

    def get_margem_lucro(self, obj):
        custo = obj.calcular_custo_total()
        preco_venda = obj.produto_final.preco_venda
        if custo > 0:
            margem = ((preco_venda - custo) / preco_venda) * 100
            return round(float(margem), 2)
        return 0.0

    def get_estoque_disponivel(self, obj):
        disponivel, faltantes = obj.verificar_estoque_ingredientes()
        return {'disponivel': disponivel, 'ingredientes_faltantes': faltantes}


class ProdutoCompostoCreateSerializer(serializers.ModelSerializer):
    ingredientes = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)

    class Meta:
        model = ProdutoComposto
        fields = ['produto_final', 'descricao_producao', 'tempo_preparo', 'custo_adicional', 'ingredientes']

    def create(self, validated_data):
        ingredientes_data = validated_data.pop('ingredientes', [])
        composto = ProdutoComposto.objects.create(**validated_data)
        for ing_data in ingredientes_data:
            IngredienteComposto.objects.create(
                produto_composto=composto,
                produto_ingrediente_id=ing_data['produto_id'],
                quantidade=Decimal(str(ing_data['quantidade'])),
                unidade=ing_data.get('unidade', 'un'),
                ordem=ing_data.get('ordem', 0)
            )
        return composto

    def update(self, instance, validated_data):
        ingredientes_data = validated_data.pop('ingredientes', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if ingredientes_data is not None:
            instance.ingredientes.all().delete()
            for ing_data in ingredientes_data:
                IngredienteComposto.objects.create(
                    produto_composto=instance,
                    produto_ingrediente_id=ing_data['produto_id'],
                    quantidade=Decimal(str(ing_data['quantidade'])),
                    unidade=ing_data.get('unidade', 'un'),
                    ordem=ing_data.get('ordem', 0)
                )
        return instance


# ========================================
# FAVORITOS E GRIDS
# ========================================

class ProdutoFavoritoSerializer(serializers.ModelSerializer):
    produto_dados = ProdutoSerializer(source='produto', read_only=True)

    class Meta:
        model = ProdutoFavorito
        fields = ['id', 'produto', 'produto_dados', 'ordem', 'contador_uso', 'created_at']
        read_only_fields = ['contador_uso', 'created_at']


class ProdutoFavoritoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProdutoFavorito
        fields = ['produto', 'ordem']

    def validate_produto(self, value):
        if not value.ativo:
            raise serializers.ValidationError("Produto não está ativo")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['usuario'] = request.user
        validated_data['loja'] = request.user.loja
        return super().create(validated_data)


class ItemGridPDVSerializer(serializers.ModelSerializer):
    produto_dados = ProdutoSerializer(source='produto', read_only=True)

    class Meta:
        model = ItemGridPDV
        fields = ['id', 'produto', 'produto_dados', 'posicao_x', 'posicao_y', 'cor_fundo', 'tamanho']


class GridProdutoPDVSerializer(serializers.ModelSerializer):
    itens = ItemGridPDVSerializer(many=True, read_only=True)
    total_produtos = serializers.SerializerMethodField()

    class Meta:
        model = GridProdutoPDV
        fields = ['id', 'nome', 'ordem', 'ativo', 'itens', 'total_produtos', 'created_at']
        read_only_fields = ['created_at']

    def get_total_produtos(self, obj):
        return obj.itens.count()


class GridProdutoPDVCreateSerializer(serializers.ModelSerializer):
    itens = ItemGridPDVSerializer(many=True, required=False)

    class Meta:
        model = GridProdutoPDV
        fields = ['nome', 'ordem', 'ativo', 'itens']

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])
        validated_data['loja'] = request.user.profile.loja
        validated_data['usuario'] = request.user
        grid = GridProdutoPDV.objects.create(**validated_data)
        for item_data in itens_data:
            ItemGridPDV.objects.create(grid=grid, **item_data)
        return grid

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if itens_data is not None:
            instance.itens.all().delete()
            for item_data in itens_data:
                ItemGridPDV.objects.create(grid=instance, **item_data)
        return instance


# ========================================
# LISTAS DE PREÇOS E PROMOÇÕES
# ========================================

class ItemListaPrecoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)

    class Meta:
        model = ItemListaPreco
        fields = [
            'id', 'produto', 'produto_nome', 'categoria', 'categoria_nome',
            'tipo_desconto', 'preco_fixo', 'desconto_percentual', 'desconto_valor',
            'quantidade_minima'
        ]


class ListaPrecoSerializer(serializers.ModelSerializer):
    itens = ItemListaPrecoSerializer(many=True, read_only=True)
    total_itens = serializers.SerializerMethodField()
    vigente = serializers.SerializerMethodField()

    class Meta:
        model = ListaPreco
        fields = [
            'id', 'nome', 'descricao', 'tipo', 'ativa',
            'quantidade_minima', 'valor_minimo_pedido',
            'validade_inicio', 'validade_fim', 'dias_semana',
            'horario_inicio', 'horario_fim', 'prioridade',
            'itens', 'total_itens', 'vigente', 'created_at'
        ]

    def get_total_itens(self, obj):
        return obj.itens.count()

    def get_vigente(self, obj):
        return obj.esta_vigente()


class PromocaoSerializer(serializers.ModelSerializer):
    produtos_count = serializers.SerializerMethodField()
    categorias_count = serializers.SerializerMethodField()
    vigente = serializers.SerializerMethodField()

    class Meta:
        model = Promocao
        fields = [
            'id', 'nome', 'descricao', 'tipo', 'ativa',
            'validade_inicio', 'validade_fim', 'produtos_count', 'categorias_count',
            'quantidade_compra', 'quantidade_paga', 'desconto_percentual',
            'produto_brinde', 'quantidade_brinde', 'pontos_cashback',
            'multiplicador_pontos', 'quantidade_maxima_uso', 'quantidade_maxima_cliente',
            'valor_minimo_compra', 'prioridade', 'exibir_pdv', 'vigente', 'created_at'
        ]

    def get_produtos_count(self, obj):
        return obj.produtos.count()

    def get_categorias_count(self, obj):
        return obj.categorias.count()

    def get_vigente(self, obj):
        return obj.esta_vigente()


class UsoPromocaoSerializer(serializers.ModelSerializer):
    promocao_nome = serializers.CharField(source='promocao.nome', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)

    class Meta:
        model = UsoPromocao
        fields = ['id', 'promocao', 'promocao_nome', 'cliente', 'cliente_nome', 'venda_id', 'valor_desconto', 'data_uso']
        read_only_fields = ['data_uso']