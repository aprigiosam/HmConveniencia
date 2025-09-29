from decimal import Decimal

from rest_framework import serializers

from .models import Cliente, FormaPagamento, Loja


def _format_currency(value: Decimal | None) -> str:
    value = value or Decimal("0")
    return f"R$ {value:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


class LojaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loja
        fields = '__all__'


class ClienteSerializer(serializers.ModelSerializer):
    total_compras = serializers.IntegerField(read_only=True)
    total_itens = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False,
    )
    valor_total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False,
    )
    valor_total_display = serializers.SerializerMethodField()
    ticket_medio = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False,
    )
    ticket_medio_display = serializers.SerializerMethodField()
    ultima_compra = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Cliente
        fields = (
            "id",
            "cpf",
            "nome",
            "telefone",
            "email",
            "endereco",
            "pontos_fidelidade",
            "ativo",
            "created_at",
            "updated_at",
            "total_compras",
            "total_itens",
            "valor_total",
            "valor_total_display",
            "ticket_medio",
            "ticket_medio_display",
            "ultima_compra",
        )

    def get_valor_total_display(self, obj: Cliente) -> str:
        valor = getattr(obj, "valor_total", None)
        return _format_currency(valor)

    def get_ticket_medio_display(self, obj: Cliente) -> str:
        valor = getattr(obj, "ticket_medio", None)
        return _format_currency(valor)


class FormaPagamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormaPagamento
        fields = '__all__'
