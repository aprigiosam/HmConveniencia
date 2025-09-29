from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from .models import Venda, ItemVenda, PagamentoVenda
from .services import finalizar_venda


class ItemVendaSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_sku = serializers.CharField(source='produto.sku', read_only=True)

    class Meta:
        model = ItemVenda
        fields = '__all__'
        extra_kwargs = {
            'venda': {'required': False},
            'valor_total': {'required': False},
        }


class PagamentoVendaSerializer(serializers.ModelSerializer):
    forma_pagamento_nome = serializers.CharField(source='forma_pagamento.nome', read_only=True)

    class Meta:
        model = PagamentoVenda
        fields = '__all__'
        extra_kwargs = {
            'venda': {'required': False},
        }


class VendaSerializer(serializers.ModelSerializer):
    itens = ItemVendaSerializer(many=True, read_only=True)
    pagamentos = PagamentoVendaSerializer(many=True, read_only=True)
    loja_nome = serializers.CharField(source='loja.nome', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)

    class Meta:
        model = Venda
        fields = '__all__'


class VendaCreateSerializer(serializers.ModelSerializer):
    itens = ItemVendaSerializer(many=True)
    pagamentos = PagamentoVendaSerializer(many=True)

    class Meta:
        model = Venda
        fields = '__all__'

    def create(self, validated_data):
        itens_data = validated_data.pop('itens')
        pagamentos_data = validated_data.pop('pagamentos')
        status_inicial = validated_data.get('status', Venda.Status.PENDENTE)

        try:
            with transaction.atomic():
                venda = Venda.objects.create(**validated_data)

                for item_data in itens_data:
                    ItemVenda.objects.create(venda=venda, **item_data)

                for pagamento_data in pagamentos_data:
                    PagamentoVenda.objects.create(venda=venda, **pagamento_data)

                venda.calcular_total()

                if status_inicial == Venda.Status.FINALIZADA:
                    venda = finalizar_venda(venda, status_anterior=Venda.Status.PENDENTE)

        except DjangoValidationError as exc:
            raise serializers.ValidationError({'detail': exc.messages}) from exc

        return venda
