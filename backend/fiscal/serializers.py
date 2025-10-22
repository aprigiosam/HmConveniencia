from rest_framework import serializers

from fiscal.models import NotaFiscal, NotaItem


class NotaItemSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)

    class Meta:
        model = NotaItem
        fields = [
            "id",
            "codigo_produto",
            "descricao",
            "produto",
            "produto_nome",
            "ncm",
            "cfop",
            "unidade",
            "quantidade",
            "valor_unitario",
            "valor_total",
            "valor_desconto",
        ]
        read_only_fields = fields


class NotaFiscalSerializer(serializers.ModelSerializer):
    itens = NotaItemSerializer(many=True, read_only=True)
    fornecedor_nome = serializers.CharField(source="fornecedor.nome", read_only=True)

    class Meta:
        model = NotaFiscal
        fields = [
            "id",
            "tipo",
            "modelo",
            "serie",
            "numero",
            "chave_acesso",
            "status",
            "ambiente",
            "protocolo",
            "motivo_rejeicao",
            "valor_produtos",
            "valor_total",
            "valor_descontos",
            "data_emissao",
            "data_autorizacao",
            "fornecedor",
            "fornecedor_nome",
            "created_at",
            "updated_at",
            "itens",
        ]
        read_only_fields = fields
