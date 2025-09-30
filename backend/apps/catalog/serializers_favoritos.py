"""
Serializers para produtos favoritos e grids personalizáveis
"""

from rest_framework import serializers
from .models_favoritos import ProdutoFavorito, GridProdutoPDV, ItemGridPDV
from .serializers import ProdutoSerializer


class ProdutoFavoritoSerializer(serializers.ModelSerializer):
    """Serializer para produtos favoritos"""

    produto_dados = ProdutoSerializer(source='produto', read_only=True)

    class Meta:
        model = ProdutoFavorito
        fields = [
            'id',
            'produto',
            'produto_dados',
            'ordem',
            'contador_uso',
            'created_at',
        ]
        read_only_fields = ['contador_uso', 'created_at']


class ProdutoFavoritoCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar favorito"""

    class Meta:
        model = ProdutoFavorito
        fields = ['produto', 'ordem']

    def validate_produto(self, value):
        """Valida que produto existe e está ativo"""
        if not value.ativo:
            raise serializers.ValidationError("Produto não está ativo")
        return value

    def create(self, validated_data):
        # Adiciona usuário e loja do request
        request = self.context.get('request')
        validated_data['usuario'] = request.user
        validated_data['loja'] = request.user.loja  # Assumindo que user tem loja

        return super().create(validated_data)


class ItemGridPDVSerializer(serializers.ModelSerializer):
    """Serializer para itens de grid"""

    produto_dados = ProdutoSerializer(source='produto', read_only=True)

    class Meta:
        model = ItemGridPDV
        fields = [
            'id',
            'produto',
            'produto_dados',
            'posicao_x',
            'posicao_y',
            'cor_fundo',
            'tamanho',
        ]


class GridProdutoPDVSerializer(serializers.ModelSerializer):
    """Serializer para grid de produtos"""

    itens = ItemGridPDVSerializer(many=True, read_only=True)
    total_produtos = serializers.SerializerMethodField()

    class Meta:
        model = GridProdutoPDV
        fields = [
            'id',
            'nome',
            'ordem',
            'ativo',
            'itens',
            'total_produtos',
            'created_at',
        ]
        read_only_fields = ['created_at']

    def get_total_produtos(self, obj):
        return obj.itens.count()


class GridProdutoPDVCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar grid"""

    itens = ItemGridPDVSerializer(many=True, required=False)

    class Meta:
        model = GridProdutoPDV
        fields = ['nome', 'ordem', 'ativo', 'itens']

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])

        # Adiciona usuário e loja
        request = self.context.get('request')
        validated_data['loja'] = request.user.loja
        validated_data['usuario'] = request.user

        grid = GridProdutoPDV.objects.create(**validated_data)

        # Cria itens
        for item_data in itens_data:
            ItemGridPDV.objects.create(grid=grid, **item_data)

        return grid

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)

        # Atualiza grid
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Atualiza itens se fornecidos
        if itens_data is not None:
            # Remove itens antigos
            instance.itens.all().delete()

            # Cria novos itens
            for item_data in itens_data:
                ItemGridPDV.objects.create(grid=instance, **item_data)

        return instance