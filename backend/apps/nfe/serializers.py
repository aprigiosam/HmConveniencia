from rest_framework import serializers

from apps.core.models import Loja
from apps.sales.models import Venda

from .models import EmitenteConfig, NotaFiscal, NotaFiscalItem


class EmitenteConfigSerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source="loja.nome", read_only=True)

    class Meta:
        model = EmitenteConfig
        fields = [
            "id",
            "loja",
            "loja_nome",
            "serie",
            "proximo_numero",
            "ambiente",
            "regime_tributario",
            "inscricao_estadual",
            "inscricao_municipal",
            "certificado_nome",
            "certificado_senha",
            "certificado_arquivo_b64",
            "csc_id",
            "csc_token",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_loja(self, value: Loja):
        if EmitenteConfig.objects.filter(loja=value).exclude(pk=self.instance.pk if self.instance else None).exists():
            raise serializers.ValidationError("Já existe uma configuração NF-e para esta loja.")
        return value


class NotaFiscalItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotaFiscalItem
        fields = [
            "id",
            "produto_nome",
            "produto_sku",
            "ncm",
            "cfop",
            "unidade",
            "quantidade",
            "valor_unitario",
            "valor_total",
            "dados_impostos",
        ]


class NotaFiscalSerializer(serializers.ModelSerializer):
    config = EmitenteConfigSerializer(read_only=True)
    itens = NotaFiscalItemSerializer(many=True, read_only=True)

    class Meta:
        model = NotaFiscal
        fields = [
            "id",
            "config",
            "venda_id",
            "numero",
            "serie",
            "chave_acesso",
            "status",
            "motivo_status",
            "total_produtos",
            "total_notafiscal",
            "impostos_totais",
            "protocolo_autorizacao",
            "dh_autorizacao",
            "ambiente",
            "dados_extra",
            "itens",
            "created_at",
            "updated_at",
        ]


class NotaFiscalCreateSerializer(serializers.Serializer):
    venda_id = serializers.IntegerField()
    loja_id = serializers.IntegerField(required=False)

    def validate(self, attrs):
        venda_id = attrs.get("venda_id")
        loja_id = attrs.get("loja_id")
        try:
            venda = Venda.objects.get(pk=venda_id)
        except Venda.DoesNotExist as exc:
            raise serializers.ValidationError({"venda_id": "Venda não encontrada."}) from exc

        if not venda.loja_id:
            raise serializers.ValidationError({"venda_id": "Venda sem loja associada."})

        if loja_id and loja_id != venda.loja_id:
            raise serializers.ValidationError({"loja_id": "Venda não pertence à loja informada."})

        try:
            config = EmitenteConfig.objects.get(loja_id=venda.loja_id)
        except EmitenteConfig.DoesNotExist as exc:
            raise serializers.ValidationError({"config": "Configuração NF-e não encontrada para a loja da venda."}) from exc

        attrs["venda"] = venda
        attrs["config"] = config
        return attrs
