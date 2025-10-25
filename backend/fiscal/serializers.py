from rest_framework import serializers

from fiscal.models import Empresa, NotaFiscal, NotaItem


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = [
            "id",
            "razao_social",
            "nome_fantasia",
            "cnpj",
            "inscricao_estadual",
            "inscricao_municipal",
            "ambiente",
            "email_contato",
            "telefone_contato",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


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
    fornecedor_nome = serializers.CharField(source="fornecedor.nome", read_only=True, allow_null=True)

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
            "emitente_nome",
            "emitente_documento",
            "created_at",
            "updated_at",
            "itens",
        ]
        read_only_fields = fields
