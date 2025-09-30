from rest_framework import serializers
from .models import Categoria, Fornecedor, Produto, LoteProduto


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
            'id',
            'cnpj_cpf',
            'nome',
            'telefone',
            'email',
            'responsavel',
            'contatos',
            'condicoes_pagamento',
            'prazo_medio_entrega_dias',
            'observacoes',
            'endereco',
            'ativo',
            'created_at',
            'updated_at',
            'produtos_ativos',
            'estoque_total',
            'valor_estoque',
        ]

    def validate_contatos(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Formato inválido, envie uma lista de contatos.")
        contatos_norm = []
        for contato in value:
            if not isinstance(contato, dict):
                raise serializers.ValidationError("Cada contato deve ser um objeto com chaves nome/telefone/email.")
            contatos_norm.append(
                {
                    "nome": contato.get("nome", ""),
                    "telefone": contato.get("telefone", ""),
                    "email": contato.get("email", ""),
                    "observacao": contato.get("observacao", ""),
                }
            )
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
    """Serializer simplificado para listagem de produtos"""
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
                raise serializers.ValidationError(f"Campo {field} é obrigatório no lote inicial")

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
                # Buscar loja padrão ou primeira loja disponível
                loja = Loja.objects.first()
                if not loja:
                    raise serializers.ValidationError("Nenhuma loja encontrada para criar o lote")

                # Criar lote
                lote = LoteProduto.objects.create(
                    produto=produto,
                    loja=loja,
                    numero_lote=lote_data['numero_lote'],
                    data_vencimento=lote_data.get('data_vencimento'),
                    quantidade=lote_data['quantidade'],
                    custo_unitario=lote_data.get('custo_unitario', produto.preco_custo)
                )

                # Registrar movimentação de entrada
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
