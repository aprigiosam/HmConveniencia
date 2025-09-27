from rest_framework import serializers
from django.utils import timezone
from datetime import date, timedelta
from .models import MovimentacaoEstoque, TransferenciaEstoque, InventarioEstoque, ItemInventario
from apps.catalog.models import LoteProduto, Produto
from apps.core.models import Loja


class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_sku = serializers.CharField(source='produto.sku', read_only=True)
    loja_nome = serializers.CharField(source='loja.nome', read_only=True)
    lote_numero = serializers.CharField(source='lote.numero_lote', read_only=True)
    lote_vencimento = serializers.DateField(source='lote.data_vencimento', read_only=True)

    class Meta:
        model = MovimentacaoEstoque
        fields = '__all__'


class LoteComVencimentoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_sku = serializers.CharField(source='produto.sku', read_only=True)
    loja_nome = serializers.CharField(source='loja.nome', read_only=True)
    dias_vencimento = serializers.SerializerMethodField()
    status_vencimento = serializers.SerializerMethodField()
    pode_vender = serializers.SerializerMethodField()

    class Meta:
        model = LoteProduto
        fields = [
            'id', 'numero_lote', 'data_vencimento', 'quantidade', 'custo_unitario',
            'produto', 'produto_nome', 'produto_sku', 'loja', 'loja_nome',
            'dias_vencimento', 'status_vencimento', 'pode_vender',
            'created_at', 'updated_at'
        ]

    def get_dias_vencimento(self, obj):
        if not obj.data_vencimento:
            return None
        hoje = date.today()
        delta = obj.data_vencimento - hoje
        return delta.days

    def get_status_vencimento(self, obj):
        if not obj.data_vencimento:
            return "SEM_CONTROLE"

        dias = self.get_dias_vencimento(obj)
        produto = obj.produto

        if dias < 0:
            return "VENCIDO"
        elif dias <= produto.dias_alerta_vencimento:
            return "PROXIMO_VENCIMENTO"
        else:
            return "OK"

    def get_pode_vender(self, obj):
        if not obj.data_vencimento:
            return True

        status = self.get_status_vencimento(obj)
        if status == "VENCIDO":
            return obj.produto.permite_venda_vencido
        return True


class TransferenciaEstoqueSerializer(serializers.ModelSerializer):
    loja_origem_nome = serializers.CharField(source='loja_origem.nome', read_only=True)
    loja_destino_nome = serializers.CharField(source='loja_destino.nome', read_only=True)
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_sku = serializers.CharField(source='produto.sku', read_only=True)
    lote_origem_numero = serializers.CharField(source='lote_origem.numero_lote', read_only=True)
    lote_destino_numero = serializers.CharField(source='lote_destino.numero_lote', read_only=True)

    class Meta:
        model = TransferenciaEstoque
        fields = '__all__'


class ItemInventarioSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_sku = serializers.CharField(source='produto.sku', read_only=True)
    lote_numero = serializers.CharField(source='lote.numero_lote', read_only=True)

    class Meta:
        model = ItemInventario
        fields = '__all__'


class InventarioEstoqueSerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source='loja.nome', read_only=True)
    itens = ItemInventarioSerializer(many=True, read_only=True)
    total_itens = serializers.SerializerMethodField()
    total_diferencas = serializers.SerializerMethodField()

    class Meta:
        model = InventarioEstoque
        fields = '__all__'

    def get_total_itens(self, obj):
        return obj.itens.count()

    def get_total_diferencas(self, obj):
        return obj.itens.exclude(diferenca=0).count()


class EntradaEstoqueSerializer(serializers.Serializer):
    """Serializer para entrada de estoque com criação/atualização de lote"""
    produto = serializers.IntegerField()
    numero_lote = serializers.CharField(max_length=100)
    data_vencimento = serializers.DateField(required=False, allow_null=True)
    quantidade = serializers.DecimalField(max_digits=10, decimal_places=2)
    custo_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)
    motivo = serializers.CharField(max_length=255, default="Entrada de estoque")
    observacoes = serializers.CharField(required=False, allow_blank=True)

    def validate_produto(self, value):
        try:
            produto = Produto.objects.get(id=value)
            return value
        except Produto.DoesNotExist:
            raise serializers.ValidationError("Produto não encontrado.")

    def validate_data_vencimento(self, value):
        if value and value <= date.today():
            raise serializers.ValidationError("Data de vencimento deve ser futura.")
        return value

    def validate_quantidade(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantidade deve ser maior que zero.")
        return value

    def validate_custo_unitario(self, value):
        if value <= 0:
            raise serializers.ValidationError("Custo unitário deve ser maior que zero.")
        return value


class AjusteEstoqueSerializer(serializers.Serializer):
    """Serializer para ajustes de estoque"""
    produto = serializers.IntegerField()
    lote = serializers.IntegerField(required=False, allow_null=True)
    quantidade = serializers.DecimalField(max_digits=10, decimal_places=2)
    motivo = serializers.CharField(max_length=255)
    observacoes = serializers.CharField(required=False, allow_blank=True)

    def validate_produto(self, value):
        try:
            Produto.objects.get(id=value)
            return value
        except Produto.DoesNotExist:
            raise serializers.ValidationError("Produto não encontrado.")

    def validate_lote(self, value):
        if value:
            try:
                LoteProduto.objects.get(id=value)
                return value
            except LoteProduto.DoesNotExist:
                raise serializers.ValidationError("Lote não encontrado.")
        return value