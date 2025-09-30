"""
Serializers para combos e produtos compostos
"""

from rest_framework import serializers
from decimal import Decimal
from .models_combos import (
    ProdutoCombo, ItemCombo, OpcaoSubstituicao,
    ProdutoComposto, IngredienteComposto
)
from .serializers import ProdutoSerializer


class OpcaoSubstituicaoSerializer(serializers.ModelSerializer):
    """Serializer para opções de substituição"""

    produto_substituto_dados = ProdutoSerializer(source='produto_substituto', read_only=True)

    class Meta:
        model = OpcaoSubstituicao
        fields = ['id', 'produto_substituto', 'produto_substituto_dados', 'acrescimo_preco']


class ItemComboSerializer(serializers.ModelSerializer):
    """Serializer para itens de combo"""

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
    """Serializer para combos"""

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
            'itens', 'total_itens', 'economia', 'disponivel',
            'created_at'
        ]
        read_only_fields = ['preco_original', 'desconto_percentual']

    def get_total_itens(self, obj):
        return obj.itens.count()

    def get_economia(self, obj):
        """Quanto o cliente economiza comprando o combo"""
        return float(obj.preco_original - obj.preco_combo)

    def get_disponivel(self, obj):
        """Verifica se combo está disponível"""
        disponivel, motivo = obj.verificar_disponibilidade()
        return {
            'disponivel': disponivel,
            'motivo': motivo if not disponivel else None
        }


class ProdutoComboCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar/atualizar combo"""

    itens = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = ProdutoCombo
        fields = [
            'nome', 'descricao', 'sku', 'tipo', 'preco_combo',
            'imagem', 'ativo', 'estoque_minimo', 'ordem_exibicao', 'itens'
        ]

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])

        combo = ProdutoCombo.objects.create(**validated_data)

        # Cria itens
        for item_data in itens_data:
            ItemCombo.objects.create(
                combo=combo,
                produto_id=item_data['produto_id'],
                quantidade=Decimal(str(item_data.get('quantidade', 1))),
                opcional=item_data.get('opcional', False),
                substituivel=item_data.get('substituivel', False),
                ordem=item_data.get('ordem', 0)
            )

        # Atualiza cálculos
        combo.atualizar_calculos()

        return combo

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)

        # Atualiza combo
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Atualiza itens se fornecidos
        if itens_data is not None:
            # Remove itens antigos
            instance.itens.all().delete()

            # Cria novos itens
            for item_data in itens_data:
                ItemCombo.objects.create(
                    combo=instance,
                    produto_id=item_data['produto_id'],
                    quantidade=Decimal(str(item_data.get('quantidade', 1))),
                    opcional=item_data.get('opcional', False),
                    substituivel=item_data.get('substituivel', False),
                    ordem=item_data.get('ordem', 0)
                )

            # Atualiza cálculos
            instance.atualizar_calculos()

        return instance


class IngredienteCompostoSerializer(serializers.ModelSerializer):
    """Serializer para ingredientes de produto composto"""

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
    """Serializer para produtos compostos"""

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
        """Calcula margem de lucro do produto"""
        custo = obj.calcular_custo_total()
        preco_venda = obj.produto_final.preco_venda

        if custo > 0:
            margem = ((preco_venda - custo) / preco_venda) * 100
            return round(float(margem), 2)
        return 0.0

    def get_estoque_disponivel(self, obj):
        """Verifica disponibilidade de ingredientes"""
        disponivel, faltantes = obj.verificar_estoque_ingredientes()
        return {
            'disponivel': disponivel,
            'ingredientes_faltantes': faltantes
        }


class ProdutoCompostoCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar/atualizar produto composto"""

    ingredientes = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = ProdutoComposto
        fields = [
            'produto_final', 'descricao_producao', 'tempo_preparo',
            'custo_adicional', 'ingredientes'
        ]

    def create(self, validated_data):
        ingredientes_data = validated_data.pop('ingredientes', [])

        composto = ProdutoComposto.objects.create(**validated_data)

        # Cria ingredientes
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

        # Atualiza produto composto
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Atualiza ingredientes se fornecidos
        if ingredientes_data is not None:
            # Remove ingredientes antigos
            instance.ingredientes.all().delete()

            # Cria novos ingredientes
            for ing_data in ingredientes_data:
                IngredienteComposto.objects.create(
                    produto_composto=instance,
                    produto_ingrediente_id=ing_data['produto_id'],
                    quantidade=Decimal(str(ing_data['quantidade'])),
                    unidade=ing_data.get('unidade', 'un'),
                    ordem=ing_data.get('ordem', 0)
                )

        return instance