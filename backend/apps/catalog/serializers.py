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
    produtos_count = serializers.SerializerMethodField()

    class Meta:
        model = Fornecedor
        fields = '__all__'

    def get_produtos_count(self, obj):
        return obj.produtos.count()


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
            raise serializers.ValidationError("SKU já existe.")
        return value

    def validate_codigo_barras(self, value):
        if self.instance and self.instance.codigo_barras == value:
            return value
        if Produto.objects.filter(codigo_barras=value).exists():
            raise serializers.ValidationError("Código de barras já existe.")
        return value

    def validate(self, data):
        if data.get('preco_venda', 0) < data.get('preco_custo', 0):
            raise serializers.ValidationError("Preço de venda não pode ser menor que o preço de custo.")
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