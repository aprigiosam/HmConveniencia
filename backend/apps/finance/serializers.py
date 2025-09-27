from rest_framework import serializers
from .models import ContaReceber, ContaPagar, FluxoCaixa


class ContaReceberSerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source='loja.nome', read_only=True)
    venda_numero = serializers.CharField(source='venda.numero_venda', read_only=True)

    class Meta:
        model = ContaReceber
        fields = '__all__'


class ContaPagarSerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source='loja.nome', read_only=True)

    class Meta:
        model = ContaPagar
        fields = '__all__'


class FluxoCaixaSerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source='loja.nome', read_only=True)

    class Meta:
        model = FluxoCaixa
        fields = '__all__'