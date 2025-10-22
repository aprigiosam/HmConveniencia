"""
Serializers para API - HMConveniencia
"""

from decimal import Decimal
from django.db.models import Sum
from django.db import transaction
from rest_framework import serializers
from fiscal.models import NotaFiscal
from .models import (
    Cliente,
    Fornecedor,
    Produto,
    Venda,
    ItemVenda,
    Caixa,
    MovimentacaoCaixa,
    Categoria,
    Alerta,
    Lote,
)


class ClienteSerializer(serializers.ModelSerializer):
    saldo_devedor = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = [
            "id",
            "nome",
            "telefone",
            "cpf",
            "endereco",
            "limite_credito",
            "saldo_devedor",
            "ativo",
            "created_at",
        ]
        read_only_fields = ["created_at", "saldo_devedor"]

    def get_saldo_devedor(self, obj):
        return float(obj.saldo_devedor())

    def validate_cpf(self, value):
        if value == "":
            return None
        return value


class FornecedorSerializer(serializers.ModelSerializer):
    """Serializer para Fornecedores"""

    total_lotes = serializers.SerializerMethodField()
    total_compras = serializers.SerializerMethodField()
    total_notas = serializers.SerializerMethodField()
    valor_notas = serializers.SerializerMethodField()
    ultima_compra_data = serializers.SerializerMethodField()
    ultima_compra_valor = serializers.SerializerMethodField()
    ultima_nota_chave = serializers.SerializerMethodField()

    class Meta:
        model = Fornecedor
        fields = [
            "id",
            "nome",
            "nome_fantasia",
            "cnpj",
            "telefone",
            "email",
            "endereco",
            "observacoes",
            "ativo",
            "created_at",
            "updated_at",
            "total_lotes",
            "total_compras",
            "total_notas",
            "valor_notas",
            "ultima_compra_data",
            "ultima_compra_valor",
            "ultima_nota_chave",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "total_lotes",
            "total_compras",
            "total_notas",
            "valor_notas",
            "ultima_compra_data",
            "ultima_compra_valor",
            "ultima_nota_chave",
        ]

    def get_total_lotes(self, obj):
        return obj.total_lotes()

    def get_total_compras(self, obj):
        if hasattr(obj, "valor_notas") and obj.valor_notas is not None:
            return float(obj.valor_notas)
        return float(obj.total_compras())

    def get_total_notas(self, obj):
        if hasattr(obj, "total_notas") and obj.total_notas is not None:
            return int(obj.total_notas)
        return NotaFiscal.objects.filter(fornecedor=obj).count()

    def get_valor_notas(self, obj):
        if hasattr(obj, "valor_notas") and obj.valor_notas is not None:
            return float(obj.valor_notas)
        total = NotaFiscal.objects.filter(fornecedor=obj).aggregate(
            total=Sum("valor_total")
        )["total"]
        return float(total or 0)

    def get_ultima_compra_data(self, obj):
        valor = getattr(obj, "ultima_compra_data", None)
        if valor:
            return valor
        nota = (
            NotaFiscal.objects.filter(fornecedor=obj)
            .order_by("-data_emissao", "-created_at")
            .first()
        )
        return nota.data_emissao if nota else None

    def get_ultima_compra_valor(self, obj):
        valor = getattr(obj, "ultima_compra_valor", None)
        if valor is not None:
            return float(valor)
        nota = (
            NotaFiscal.objects.filter(fornecedor=obj)
            .order_by("-data_emissao", "-created_at")
            .first()
        )
        return float(nota.valor_total) if nota else None

    def get_ultima_nota_chave(self, obj):
        chave = getattr(obj, "ultima_nota_chave", None)
        if chave:
            return chave
        nota = (
            NotaFiscal.objects.filter(fornecedor=obj)
            .order_by("-data_emissao", "-created_at")
            .first()
        )
        return nota.chave_acesso if nota else None

    def validate_cnpj(self, value):
        if value == "":
            return None
        return value


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nome", "ativo", "created_at"]
        read_only_fields = ["created_at"]


class LoteSerializer(serializers.ModelSerializer):
    """Serializer para Lotes"""

    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    fornecedor_nome = serializers.CharField(
        source="fornecedor.nome", read_only=True, allow_null=True
    )
    esta_vencido = serializers.SerializerMethodField()
    dias_para_vencer = serializers.SerializerMethodField()
    proximo_vencimento = serializers.SerializerMethodField()

    class Meta:
        model = Lote
        fields = [
            "id",
            "produto",
            "produto_nome",
            "numero_lote",
            "quantidade",
            "data_validade",
            "data_entrada",
            "fornecedor",
            "fornecedor_nome",
            "preco_custo_lote",
            "observacoes",
            "ativo",
            "created_at",
            "updated_at",
            "esta_vencido",
            "dias_para_vencer",
            "proximo_vencimento",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "esta_vencido",
            "dias_para_vencer",
            "proximo_vencimento",
            "fornecedor_nome",
        ]

    def get_esta_vencido(self, obj):
        return obj.esta_vencido

    def get_dias_para_vencer(self, obj):
        return obj.dias_para_vencer

    def get_proximo_vencimento(self, obj):
        return obj.proximo_vencimento

    def validate_quantidade(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Quantidade deve ser maior que zero")
        return value

    def update(self, instance, validated_data):
        nova_quantidade = validated_data.get("quantidade", instance.quantidade)

        if nova_quantidade is None or nova_quantidade <= 0:
            raise serializers.ValidationError({"quantidade": "Quantidade deve ser maior que zero"})

        with transaction.atomic():
            return super().update(instance, validated_data)


class ProdutoSerializer(serializers.ModelSerializer):
    margem_lucro = serializers.SerializerMethodField()
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True)
    esta_vencido = serializers.SerializerMethodField()
    dias_para_vencer = serializers.SerializerMethodField()
    proximo_vencimento = serializers.SerializerMethodField()
    lotes = LoteSerializer(many=True, read_only=True)
    total_lotes = serializers.SerializerMethodField()
    estoque_lotes = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = [
            "id",
            "nome",
            "preco",
            "preco_custo",
            "estoque",
            "codigo_barras",
            "data_validade",
            "ativo",
            "created_at",
            "margem_lucro",
            "categoria",
            "categoria_nome",
            "esta_vencido",
            "dias_para_vencer",
            "proximo_vencimento",
            "lotes",
            "total_lotes",
            "estoque_lotes",
        ]
        read_only_fields = [
            "created_at",
            "margem_lucro",
            "esta_vencido",
            "dias_para_vencer",
            "proximo_vencimento",
            "lotes",
            "total_lotes",
            "estoque_lotes",
        ]

    def get_margem_lucro(self, obj):
        return float(obj.margem_lucro)

    def get_esta_vencido(self, obj):
        return obj.esta_vencido

    def get_dias_para_vencer(self, obj):
        return obj.dias_para_vencer

    def get_proximo_vencimento(self, obj):
        return obj.proximo_vencimento

    def get_total_lotes(self, obj):
        """Retorna quantidade de lotes ativos do produto"""
        return obj.lotes.filter(ativo=True).count()

    def get_estoque_lotes(self, obj):
        """Retorna estoque total somando todos os lotes ativos"""
        from django.db.models import Sum

        total = obj.lotes.filter(ativo=True).aggregate(total=Sum("quantidade"))["total"]
        return float(total) if total else 0.0


class ItemVendaSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)

    class Meta:
        model = ItemVenda
        fields = [
            "id",
            "produto",
            "produto_nome",
            "quantidade",
            "preco_unitario",
            "subtotal",
        ]
        read_only_fields = ["subtotal"]


class VendaSerializer(serializers.ModelSerializer):
    itens = ItemVendaSerializer(many=True, read_only=True)
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)

    class Meta:
        model = Venda
        fields = [
            "id",
            "numero",
            "cliente",
            "cliente_nome",
            "status",
            "forma_pagamento",
            "status_pagamento",
            "total",
            "desconto",
            "observacoes",
            "data_vencimento",
            "created_at",
            "itens",
        ]
        read_only_fields = ["numero", "total", "created_at"]


class MovimentacaoCaixaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimentacaoCaixa
        fields = ["id", "caixa", "tipo", "valor", "descricao", "created_at"]
        read_only_fields = ["created_at", "caixa"]


class CaixaSerializer(serializers.ModelSerializer):
    movimentacoes = MovimentacaoCaixaSerializer(many=True, read_only=True)

    class Meta:
        model = Caixa
        fields = [
            "id",
            "data_abertura",
            "data_fechamento",
            "valor_inicial",
            "valor_final_sistema",
            "valor_final_informado",
            "diferenca",
            "status",
            "observacoes",
            "movimentacoes",
        ]
        read_only_fields = [
            "data_abertura",
            "data_fechamento",
            "valor_final_sistema",
            "diferenca",
            "status",
            "movimentacoes",
        ]


class VendaCreateSerializer(serializers.Serializer):
    """Serializer para criar venda completa com itens"""

    forma_pagamento = serializers.ChoiceField(choices=Venda.FORMA_PAGAMENTO_CHOICES)
    cliente_id = serializers.IntegerField(required=False, allow_null=True)
    data_vencimento = serializers.DateField(required=False, allow_null=True)
    desconto = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    observacoes = serializers.CharField(required=False, allow_blank=True)
    itens = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()), allow_empty=False
    )

    def validate(self, data):
        """Validações gerais"""
        if data.get("forma_pagamento") == "FIADO":
            if not data.get("cliente_id"):
                raise serializers.ValidationError(
                    {"cliente_id": "Cliente é obrigatório para vendas fiado"}
                )

            if not data.get("data_vencimento"):
                raise serializers.ValidationError(
                    {
                        "data_vencimento": "Data de vencimento é obrigatória para vendas fiado"
                    }
                )

            # Valida que data de vencimento não pode ser no passado
            from datetime import date

            if data["data_vencimento"] < date.today():
                raise serializers.ValidationError(
                    {"data_vencimento": "Data de vencimento não pode ser no passado"}
                )

            # Verifica se cliente existe
            try:
                cliente = Cliente.objects.get(id=data["cliente_id"])
                if not cliente.ativo:
                    raise serializers.ValidationError(
                        {"cliente_id": "Cliente está inativo"}
                    )

                # VALIDAÇÃO CRÍTICA: Verifica limite de crédito
                # Calcula o total da venda
                total_venda = Decimal("0")
                for item in data.get("itens", []):
                    try:
                        produto = Produto.objects.get(id=int(item["produto_id"]))
                        quantidade = Decimal(item["quantidade"])
                        total_venda += produto.preco * quantidade
                    except (Produto.DoesNotExist, ValueError, KeyError):
                        pass  # Será validado em validate_itens

                # Aplica desconto
                total_venda -= data.get("desconto", Decimal("0"))

                # Verifica se cliente pode comprar fiado
                if not cliente.pode_comprar_fiado(total_venda):
                    saldo_atual = cliente.saldo_devedor()
                    limite = cliente.limite_credito
                    disponivel = limite - saldo_atual
                    raise serializers.ValidationError(
                        {
                            "cliente_id": f"Cliente estourou limite de crédito. "
                            f"Limite: R$ {limite:.2f}, "
                            f"Deve: R$ {saldo_atual:.2f}, "
                            f"Disponível: R$ {disponivel:.2f}, "
                            f"Tentando: R$ {total_venda:.2f}"
                        }
                    )

            except Cliente.DoesNotExist:
                raise serializers.ValidationError(
                    {"cliente_id": "Cliente não encontrado"}
                )
        return data

    def validate_itens(self, value):
        """Valida os itens da venda"""
        if not value:
            raise serializers.ValidationError("Venda deve ter pelo menos um item")

        for idx, item in enumerate(value):
            if "produto_id" not in item or "quantidade" not in item:
                raise serializers.ValidationError(
                    f"Item {idx + 1}: deve ter produto_id e quantidade"
                )

            try:
                produto_id = int(item["produto_id"])
                quantidade = Decimal(str(item["quantidade"]))

                if quantidade <= 0:
                    raise serializers.ValidationError(
                        f"Item {idx + 1}: quantidade deve ser maior que zero"
                    )

                produto = Produto.objects.get(id=produto_id)
                if not produto.ativo:
                    raise serializers.ValidationError(
                        f"Produto '{produto.nome}' está inativo e não pode ser vendido"
                    )

                if not produto.tem_estoque(quantidade):
                    raise serializers.ValidationError(
                        f"Estoque insuficiente para '{produto.nome}'. "
                        f"Disponível: {produto.estoque}, solicitado: {quantidade}"
                    )

            except Produto.DoesNotExist:
                raise serializers.ValidationError(
                    f"Item {idx + 1}: produto com ID {produto_id} não encontrado"
                )
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    f"Item {idx + 1}: produto_id e quantidade devem ser números válidos"
                )

        return value

    def create(self, validated_data):
        """Cria venda com itens"""
        itens_data = validated_data.pop("itens")

        # Cria a venda
        venda = Venda.objects.create(
            forma_pagamento=validated_data["forma_pagamento"],
            desconto=validated_data.get("desconto", 0),
            observacoes=validated_data.get("observacoes", ""),
        )

        # Cria os itens
        for item_data in itens_data:
            produto = Produto.objects.get(id=int(item_data["produto_id"]))
            quantidade = Decimal(item_data["quantidade"])

            ItemVenda.objects.create(
                venda=venda,
                produto=produto,
                quantidade=quantidade,
                preco_unitario=produto.preco,
            )

        # Calcula total e finaliza
        venda.calcular_total()
        venda.finalizar(
            forma_pagamento=validated_data["forma_pagamento"],
            cliente_id=validated_data.get("cliente_id"),
            data_vencimento=validated_data.get("data_vencimento"),
        )

        return venda


class AlertaSerializer(serializers.ModelSerializer):
    """Serializer para Alertas"""

    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    venda_numero = serializers.CharField(source="venda.numero", read_only=True)
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    prioridade_display = serializers.CharField(
        source="get_prioridade_display", read_only=True
    )

    # Informações do lote
    lote_numero = serializers.CharField(source="lote.numero_lote", read_only=True)
    lote_quantidade = serializers.DecimalField(
        source="lote.quantidade", max_digits=10, decimal_places=2, read_only=True
    )
    lote_data_validade = serializers.DateField(
        source="lote.data_validade", read_only=True
    )
    lote_fornecedor = serializers.CharField(source="lote.fornecedor", read_only=True)

    class Meta:
        model = Alerta
        fields = [
            "id",
            "tipo",
            "tipo_display",
            "prioridade",
            "prioridade_display",
            "titulo",
            "mensagem",
            "cliente",
            "cliente_nome",
            "produto",
            "produto_nome",
            "venda",
            "venda_numero",
            "caixa",
            "lote",
            "lote_numero",
            "lote_quantidade",
            "lote_data_validade",
            "lote_fornecedor",
            "lido",
            "resolvido",
            "notificado",
            "created_at",
            "resolvido_em",
        ]
        read_only_fields = [
            "created_at",
            "resolvido_em",
            "tipo_display",
            "prioridade_display",
            "lote_numero",
            "lote_quantidade",
            "lote_data_validade",
            "lote_fornecedor",
        ]
