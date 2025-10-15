"""
Serializers para API - HMConveniencia
"""
from decimal import Decimal
from rest_framework import serializers
from .models import Cliente, Produto, Venda, ItemVenda, Caixa, MovimentacaoCaixa, Categoria


class ClienteSerializer(serializers.ModelSerializer):
    saldo_devedor = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = ['id', 'nome', 'telefone', 'cpf', 'endereco', 'limite_credito',
                  'saldo_devedor', 'ativo', 'created_at']
        read_only_fields = ['created_at', 'saldo_devedor']

    def get_saldo_devedor(self, obj):
        return float(obj.saldo_devedor())

    def validate_cpf(self, value):
        if value == '':
            return None
        return value


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nome', 'ativo', 'created_at']
        read_only_fields = ['created_at']


class ProdutoSerializer(serializers.ModelSerializer):
    margem_lucro = serializers.SerializerMethodField()
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)

    class Meta:
        model = Produto
        fields = ['id', 'nome', 'preco', 'preco_custo', 'estoque', 'codigo_barras', 'ativo', 'created_at', 'margem_lucro', 'categoria', 'categoria_nome']
        read_only_fields = ['created_at', 'margem_lucro']

    def get_margem_lucro(self, obj):
        return float(obj.margem_lucro)


class ItemVendaSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = ItemVenda
        fields = ['id', 'produto', 'produto_nome', 'quantidade', 'preco_unitario', 'subtotal']
        read_only_fields = ['subtotal']


class VendaSerializer(serializers.ModelSerializer):
    itens = ItemVendaSerializer(many=True, read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)

    class Meta:
        model = Venda
        fields = ['id', 'numero', 'cliente', 'cliente_nome', 'status', 'forma_pagamento',
                  'status_pagamento', 'total', 'desconto', 'observacoes', 'data_vencimento',
                  'created_at', 'itens']
        read_only_fields = ['numero', 'total', 'created_at']


class MovimentacaoCaixaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimentacaoCaixa
        fields = ['id', 'caixa', 'tipo', 'valor', 'descricao', 'created_at']
        read_only_fields = ['created_at', 'caixa']


class CaixaSerializer(serializers.ModelSerializer):
    movimentacoes = MovimentacaoCaixaSerializer(many=True, read_only=True)

    class Meta:
        model = Caixa
        fields = ['id', 'data_abertura', 'data_fechamento', 'valor_inicial',
                  'valor_final_sistema', 'valor_final_informado', 'diferenca',
                  'status', 'observacoes', 'movimentacoes']
        read_only_fields = ['data_abertura', 'data_fechamento', 'valor_final_sistema',
                            'diferenca', 'status', 'movimentacoes']


class VendaCreateSerializer(serializers.Serializer):
    """Serializer para criar venda completa com itens"""
    forma_pagamento = serializers.ChoiceField(choices=Venda.FORMA_PAGAMENTO_CHOICES)
    cliente_id = serializers.IntegerField(required=False, allow_null=True)
    data_vencimento = serializers.DateField(required=False, allow_null=True)
    desconto = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    observacoes = serializers.CharField(required=False, allow_blank=True)
    itens = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        allow_empty=False
    )

    def validate(self, data):
        """Validações gerais"""
        if data.get('forma_pagamento') == 'FIADO':
            if not data.get('cliente_id'):
                raise serializers.ValidationError({
                    'cliente_id': 'Cliente é obrigatório para vendas fiado'
                })
            # Verifica se cliente existe
            try:
                cliente = Cliente.objects.get(id=data['cliente_id'])
                if not cliente.ativo:
                    raise serializers.ValidationError({
                        'cliente_id': 'Cliente está inativo'
                    })
            except Cliente.DoesNotExist:
                raise serializers.ValidationError({
                    'cliente_id': 'Cliente não encontrado'
                })
        return data

    def validate_itens(self, value):
        """Valida os itens da venda"""
        if not value:
            raise serializers.ValidationError("Venda deve ter pelo menos um item")

        for item in value:
            if 'produto_id' not in item or 'quantidade' not in item:
                raise serializers.ValidationError("Cada item deve ter produto_id e quantidade")

            try:
                produto_id = int(item['produto_id'])
                quantidade = Decimal(item['quantidade'])

                if quantidade <= 0:
                    raise serializers.ValidationError("Quantidade deve ser maior que zero")

                produto = Produto.objects.get(id=produto_id)
                if not produto.ativo:
                    raise serializers.ValidationError(f"Produto {produto.nome} está inativo")

                if not produto.tem_estoque(quantidade):
                    raise serializers.ValidationError(
                        f"Estoque insuficiente para {produto.nome}. Disponível: {produto.estoque}"
                    )

            except Produto.DoesNotExist:
                raise serializers.ValidationError(f"Produto {produto_id} não encontrado")
            except (ValueError, TypeError):
                raise serializers.ValidationError("produto_id e quantidade devem ser números válidos")

        return value

    def create(self, validated_data):
        """Cria venda com itens"""
        itens_data = validated_data.pop('itens')

        # Cria a venda
        venda = Venda.objects.create(
            forma_pagamento=validated_data['forma_pagamento'],
            desconto=validated_data.get('desconto', 0),
            observacoes=validated_data.get('observacoes', '')
        )

        # Cria os itens
        for item_data in itens_data:
            produto = Produto.objects.get(id=int(item_data['produto_id']))
            quantidade = Decimal(item_data['quantidade'])

            ItemVenda.objects.create(
                venda=venda,
                produto=produto,
                quantidade=quantidade,
                preco_unitario=produto.preco
            )

        # Calcula total e finaliza
        venda.calcular_total()
        venda.finalizar(
            forma_pagamento=validated_data['forma_pagamento'],
            cliente_id=validated_data.get('cliente_id'),
            data_vencimento=validated_data.get('data_vencimento')
        )

        return venda
