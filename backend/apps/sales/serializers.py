"""
Serializers consolidados de vendas
Inclui: Vendas, Sessões PDV, Programa de Fidelidade
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from .models import (
    Venda, ItemVenda, PagamentoVenda, SessaoPDV, MovimentacaoCaixa,
    ProgramaFidelidade, ClienteFidelidade, MovimentacaoPontos,
    Recompensa, ResgatePontos
)
from .services import finalizar_venda, obter_ou_criar_sessao_aberta


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
        extra_kwargs = {
            'numero_venda': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        itens_data = validated_data.pop('itens')
        pagamentos_data = validated_data.pop('pagamentos')
        status_inicial = validated_data.get('status', Venda.Status.PENDENTE)

        loja = validated_data.get('loja')
        if not validated_data.get('sessao') and loja:
            validated_data['sessao'] = obter_ou_criar_sessao_aberta(loja)

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


class SessaoPDVSerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source='loja.nome', read_only=True)
    responsavel_nome = serializers.CharField(source='responsavel.username', read_only=True)
    diferenca_caixa = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    esta_aberta = serializers.BooleanField(read_only=True)
    total_vendas = serializers.SerializerMethodField()
    total_movimentacoes = serializers.SerializerMethodField()

    class Meta:
        model = SessaoPDV
        fields = '__all__'
        read_only_fields = [
            'codigo', 'fechada_em', 'saldo_fechamento_teorico',
            'diferenca_caixa', 'esta_aberta'
        ]

    def get_total_vendas(self, obj):
        """Retorna total de vendas da sessão"""
        from django.db.models import Sum
        total = obj.vendas.filter(status=Venda.Status.FINALIZADA).aggregate(
            total=Sum('valor_total')
        )['total']
        return float(total) if total else 0.0

    def get_total_movimentacoes(self, obj):
        """Retorna resumo de movimentações (sangrias e reforços)"""
        from django.db.models import Sum

        sangrias = obj.movimentacoes_caixa.filter(tipo='SANGRIA').aggregate(
            total=Sum('valor')
        )['total'] or 0

        reforcos = obj.movimentacoes_caixa.filter(tipo='REFORCO').aggregate(
            total=Sum('valor')
        )['total'] or 0

        return {
            'sangrias': float(sangrias),
            'reforcos': float(reforcos),
            'saldo_movimentacoes': float(reforcos - sangrias)
        }


class MovimentacaoCaixaSerializer(serializers.ModelSerializer):
    responsavel_nome = serializers.CharField(source='responsavel.username', read_only=True)
    sessao_codigo = serializers.CharField(source='sessao.codigo', read_only=True)

    class Meta:
        model = MovimentacaoCaixa
        fields = '__all__'
        read_only_fields = ['data_hora']

    def validate(self, data):
        """Valida a movimentação de caixa"""
        sessao = data.get('sessao')

        if sessao and not sessao.esta_aberta:
            raise serializers.ValidationError(
                "Não é possível movimentar caixa de uma sessão fechada"
            )

        valor = data.get('valor')
        if valor and valor <= 0:
            raise serializers.ValidationError(
                "O valor da movimentação deve ser maior que zero"
            )

        return data


class SessaoFechamentoSerializer(serializers.Serializer):
    """Serializer para fechamento de sessão"""
    saldo_fechamento_real = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=True,
        help_text="Valor real contado no caixa"
    )
    observacoes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Observações sobre o fechamento"
    )

    def validate_saldo_fechamento_real(self, value):
        if value < 0:
            raise serializers.ValidationError("O saldo não pode ser negativo")
        return value


class SessaoReaberturaSerializer(serializers.Serializer):
    """Serializer para reabertura de sessão (rescue)"""
    motivo = serializers.CharField(
        required=True,
        max_length=500,
        help_text="Motivo da reabertura da sessão"
    )

    def validate_motivo(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "O motivo deve ter pelo menos 10 caracteres"
            )
        return value


# ========================================
# PROGRAMA DE FIDELIDADE
# ========================================

class ProgramaFidelidadeSerializer(serializers.ModelSerializer):
    """Serializer para programa de fidelidade"""

    class Meta:
        model = ProgramaFidelidade
        fields = [
            'id', 'nome', 'ativo',
            'pontos_por_real', 'valor_minimo_compra',
            'pontos_por_real_desconto', 'pontos_minimos_resgate',
            'pontos_maximos_resgate_venda', 'percentual_maximo_desconto',
            'pontos_expiram', 'dias_validade_pontos',
            'multiplicador_aniversario', 'bonus_cadastro'
        ]


class MovimentacaoPontosSerializer(serializers.ModelSerializer):
    """Serializer para movimentações de pontos"""

    class Meta:
        model = MovimentacaoPontos
        fields = [
            'id', 'tipo', 'pontos', 'saldo_anterior', 'saldo_novo',
            'motivo', 'venda_id', 'data', 'created_at'
        ]


class ClienteFidelidadeSerializer(serializers.ModelSerializer):
    """Serializer para cliente no programa de fidelidade"""

    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    cliente_cpf = serializers.CharField(source='cliente.cpf', read_only=True)
    programa_nome = serializers.CharField(source='programa.nome', read_only=True)
    ultimas_movimentacoes = serializers.SerializerMethodField()

    class Meta:
        model = ClienteFidelidade
        fields = [
            'id', 'cliente', 'cliente_nome', 'cliente_cpf',
            'programa', 'programa_nome',
            'pontos_atual', 'pontos_total_acumulado', 'pontos_total_usado',
            'nivel', 'data_adesao', 'ativo',
            'ultimas_movimentacoes'
        ]
        read_only_fields = [
            'pontos_atual', 'pontos_total_acumulado', 'pontos_total_usado',
            'nivel', 'data_adesao'
        ]

    def get_ultimas_movimentacoes(self, obj):
        movimentacoes = obj.movimentacoes.all()[:5]
        return MovimentacaoPontosSerializer(movimentacoes, many=True).data


class RecompensaSerializer(serializers.ModelSerializer):
    """Serializer para recompensas"""

    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    disponivel = serializers.SerializerMethodField()

    class Meta:
        model = Recompensa
        fields = [
            'id', 'nome', 'descricao', 'tipo',
            'pontos_necessarios', 'valor_desconto',
            'produto', 'produto_nome', 'quantidade',
            'imagem', 'ativa', 'quantidade_disponivel',
            'validade_inicio', 'validade_fim', 'ordem',
            'disponivel'
        ]

    def get_disponivel(self, obj):
        disponivel, motivo = obj.esta_disponivel()
        return {
            'disponivel': disponivel,
            'motivo': motivo if not disponivel else None
        }


class ResgatePontosSerializer(serializers.ModelSerializer):
    """Serializer para resgates de pontos"""

    cliente_nome = serializers.CharField(
        source='cliente_fidelidade.cliente.nome',
        read_only=True
    )
    recompensa_nome = serializers.CharField(
        source='recompensa.nome',
        read_only=True
    )

    class Meta:
        model = ResgatePontos
        fields = [
            'id', 'cliente_fidelidade', 'cliente_nome',
            'recompensa', 'recompensa_nome',
            'pontos_gastos', 'status', 'venda_id',
            'data_utilizacao', 'created_at'
        ]
        read_only_fields = ['pontos_gastos', 'created_at']


class AplicarPontosSerializer(serializers.Serializer):
    """Serializer para aplicar pontos em uma venda"""

    pontos = serializers.IntegerField(min_value=1)

    def validate_pontos(self, value):
        cliente_fidelidade = self.context.get('cliente_fidelidade')

        if not cliente_fidelidade:
            raise serializers.ValidationError("Cliente fidelidade não fornecido")

        if value > cliente_fidelidade.pontos_atual:
            raise serializers.ValidationError(
                f"Cliente possui apenas {cliente_fidelidade.pontos_atual} pontos disponíveis"
            )

        programa = cliente_fidelidade.programa
        if value < programa.pontos_minimos_resgate:
            raise serializers.ValidationError(
                f"Mínimo de {programa.pontos_minimos_resgate} pontos para resgate"
            )

        if programa.pontos_maximos_resgate_venda > 0:
            if value > programa.pontos_maximos_resgate_venda:
                raise serializers.ValidationError(
                    f"Máximo de {programa.pontos_maximos_resgate_venda} pontos por venda"
                )

        return value
