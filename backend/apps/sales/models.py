"""
Modelos consolidados de vendas
Inclui: Vendas, Sessões PDV, Programa de Fidelidade
"""

from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone

from apps.catalog.models import LoteProduto, Produto
from apps.core.models import (
    Cliente,
    FormaPagamento,
    Loja,
    SequenciaDocumento,
    TimeStampedModel,
)

User = get_user_model()


class SessaoPDV(TimeStampedModel):
    class Status(models.TextChoices):
        ABERTA = "ABERTA", "Aberta"
        FECHADA = "FECHADA", "Fechada"

    CODIGO_SEQUENCIA = "POSSESSION"

    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="sessoes_pdv")
    responsavel = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sessoes_pdv",
    )
    codigo = models.CharField(max_length=40, unique=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ABERTA)
    aberta_em = models.DateTimeField(default=timezone.now)
    fechada_em = models.DateTimeField(null=True, blank=True)

    # Controle de caixa aprimorado
    saldo_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    saldo_fechamento_real = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"),
                                                 help_text="Saldo real contado no fechamento")
    saldo_fechamento_teorico = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"),
                                                   help_text="Saldo teórico calculado (inicial + vendas - retiradas)")

    # Mantém retrocompatibilidade
    saldo_fechamento = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    observacoes = models.TextField(blank=True)
    observacoes_fechamento = models.TextField(blank=True, help_text="Observações do fechamento")

    class Meta:
        ordering = ["-aberta_em"]

    def __str__(self) -> str:  # pragma: no cover - representação simples
        return self.codigo or "Sessão PDV"

    @property
    def esta_aberta(self) -> bool:
        return self.status == self.Status.ABERTA

    @property
    def diferenca_caixa(self) -> Decimal:
        """Calcula diferença entre saldo real e teórico"""
        return self.saldo_fechamento_real - self.saldo_fechamento_teorico

    def calcular_saldo_teorico(self) -> Decimal:
        """Calcula saldo teórico com base em vendas e movimentações"""
        from django.db.models import Sum

        # Saldo inicial
        saldo = self.saldo_inicial

        # Soma vendas em dinheiro
        vendas_dinheiro = self.vendas.filter(
            status=Venda.Status.FINALIZADA
        ).aggregate(
            total=Sum('valor_total')
        )['total'] or Decimal("0.00")

        saldo += vendas_dinheiro

        # Subtrai sangrias
        sangrias = self.movimentacoes_caixa.filter(
            tipo='SANGRIA'
        ).aggregate(
            total=Sum('valor')
        )['total'] or Decimal("0.00")

        saldo -= sangrias

        # Soma reforços
        reforcos = self.movimentacoes_caixa.filter(
            tipo='REFORCO'
        ).aggregate(
            total=Sum('valor')
        )['total'] or Decimal("0.00")

        saldo += reforcos

        return saldo

    def save(self, *args, **kwargs):
        if not self.codigo and self.loja_id:
            self.codigo = SequenciaDocumento.gerar_numero(
                loja=self.loja,
                codigo=self.CODIGO_SEQUENCIA,
            )
        super().save(*args, **kwargs)

    def fechar(self, *, saldo_fechamento_real: Decimal | None = None, observacoes: str = "") -> None:
        if not self.esta_aberta:
            raise ValueError("Sessão já está fechada")

        # Calcula saldo teórico
        self.saldo_fechamento_teorico = self.calcular_saldo_teorico()

        # Define saldo real
        if saldo_fechamento_real is not None:
            self.saldo_fechamento_real = saldo_fechamento_real
        else:
            self.saldo_fechamento_real = self.saldo_fechamento_teorico

        # Retrocompatibilidade
        self.saldo_fechamento = self.saldo_fechamento_real

        self.status = self.Status.FECHADA
        self.fechada_em = timezone.now()
        self.observacoes_fechamento = observacoes

        self.save(update_fields=[
            "status", "fechada_em",
            "saldo_fechamento", "saldo_fechamento_real", "saldo_fechamento_teorico",
            "observacoes_fechamento", "updated_at"
        ])

    def reabrir(self, *, responsavel: User, motivo: str = "") -> None:
        """
        Reabre uma sessão fechada (rescue session)
        Usado para correções ou operações emergenciais
        """
        if self.esta_aberta:
            raise ValueError("Sessão já está aberta")

        # Registra a reabertura nas observações
        obs_reabertura = f"\n\n[REABERTURA em {timezone.now().strftime('%d/%m/%Y %H:%M')}]\n"
        obs_reabertura += f"Responsável: {responsavel.username}\n"
        obs_reabertura += f"Motivo: {motivo}\n"
        obs_reabertura += f"Fechamento anterior: {self.fechada_em.strftime('%d/%m/%Y %H:%M') if self.fechada_em else 'N/A'}"

        self.observacoes_fechamento += obs_reabertura

        # Reabre a sessão
        self.status = self.Status.ABERTA
        self.fechada_em = None

        # Não limpa os valores de fechamento para manter histórico
        # mas permite novo fechamento

        self.save(update_fields=[
            "status", "fechada_em", "observacoes_fechamento", "updated_at"
        ])


class MovimentacaoCaixa(TimeStampedModel):
    """Registra sangrias e reforços de caixa durante a sessão"""

    class Tipo(models.TextChoices):
        SANGRIA = "SANGRIA", "Sangria"
        REFORCO = "REFORCO", "Reforço"

    sessao = models.ForeignKey(SessaoPDV, on_delete=models.CASCADE, related_name="movimentacoes_caixa")
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    motivo = models.CharField(max_length=255, help_text="Motivo da movimentação")
    responsavel = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="movimentacoes_caixa"
    )
    data_hora = models.DateTimeField(default=timezone.now)
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ["-data_hora"]
        verbose_name = "Movimentação de Caixa"
        verbose_name_plural = "Movimentações de Caixa"

    def __str__(self):
        return f"{self.tipo} - R$ {self.valor} - {self.sessao.codigo}"

    def save(self, *args, **kwargs):
        if not self.sessao.esta_aberta:
            raise ValueError("Não é possível movimentar caixa de sessão fechada")
        super().save(*args, **kwargs)


class Venda(TimeStampedModel):
    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        FINALIZADA = "FINALIZADA", "Finalizada"
        CANCELADA = "CANCELADA", "Cancelada"

    CODIGO_SEQUENCIA = "POS"

    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="vendas")
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, null=True, blank=True, related_name="vendas")
    sessao = models.ForeignKey(
        SessaoPDV,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="vendas",
    )
    numero_venda = models.CharField(max_length=50, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    valor_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    valor_desconto = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Venda {self.numero_venda}"

    def calcular_total(self):
        self.valor_subtotal = sum(item.valor_total for item in self.itens.all())
        self.valor_total = self.valor_subtotal - self.valor_desconto
        self.save(update_fields=["valor_subtotal", "valor_total", "updated_at"])

    def save(self, *args, **kwargs):
        if not self.numero_venda and self.loja_id:
            self.numero_venda = SequenciaDocumento.gerar_numero(
                loja=self.loja,
                codigo=self.CODIGO_SEQUENCIA,
            )
        super().save(*args, **kwargs)


class ItemVenda(TimeStampedModel):
    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name="itens")
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    lote = models.ForeignKey(LoteProduto, on_delete=models.PROTECT, null=True, blank=True)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        self.valor_total = self.quantidade * self.preco_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.produto.nome} - {self.quantidade}"


class PagamentoVenda(TimeStampedModel):
    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name="pagamentos")
    forma_pagamento = models.ForeignKey(FormaPagamento, on_delete=models.PROTECT)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.forma_pagamento.nome} - R$ {self.valor}"


# ========================================
# PROGRAMA DE FIDELIDADE
# ========================================

class ProgramaFidelidade(TimeStampedModel):
    """Configuração do programa de fidelidade por loja"""

    loja = models.OneToOneField(
        Loja,
        on_delete=models.CASCADE,
        related_name='programa_fidelidade'
    )

    nome = models.CharField(
        max_length=100,
        default="Programa de Fidelidade",
        help_text="Nome do programa"
    )

    ativo = models.BooleanField(default=True)

    # Regras de pontuação
    pontos_por_real = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('1.00'),
        help_text="Quantos pontos o cliente ganha por cada R$ 1,00 gasto"
    )

    valor_minimo_compra = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Valor mínimo de compra para ganhar pontos"
    )

    # Regras de resgate
    pontos_por_real_desconto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('100.00'),
        help_text="Quantos pontos equivalem a R$ 1,00 de desconto"
    )

    pontos_minimos_resgate = models.IntegerField(
        default=100,
        help_text="Pontos mínimos para começar a resgatar"
    )

    pontos_maximos_resgate_venda = models.IntegerField(
        default=0,
        help_text="Máximo de pontos que pode ser usado em uma venda (0=ilimitado)"
    )

    percentual_maximo_desconto = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('50.00'),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentual máximo de desconto usando pontos em uma venda"
    )

    # Expiração de pontos
    pontos_expiram = models.BooleanField(
        default=False,
        help_text="Pontos têm validade?"
    )

    dias_validade_pontos = models.IntegerField(
        default=365,
        help_text="Dias de validade dos pontos"
    )

    # Bônus e multiplicadores
    multiplicador_aniversario = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=Decimal('2.0'),
        help_text="Multiplicador de pontos no mês de aniversário do cliente"
    )

    bonus_cadastro = models.IntegerField(
        default=0,
        help_text="Pontos de bônus ao cadastrar no programa"
    )

    class Meta:
        verbose_name = "Programa de Fidelidade"
        verbose_name_plural = "Programas de Fidelidade"

    def __str__(self):
        return f"{self.nome} - {self.loja.nome}"

    def calcular_pontos(self, valor_compra: Decimal, cliente: Cliente = None) -> int:
        """Calcula quantos pontos o cliente ganha em uma compra"""
        if valor_compra < self.valor_minimo_compra:
            return 0

        pontos = int(valor_compra * self.pontos_por_real)

        # Aplica multiplicador de aniversário
        if cliente and cliente.data_nascimento:
            hoje = timezone.now().date()
            if (cliente.data_nascimento.month == hoje.month and
                cliente.data_nascimento.day == hoje.day):
                pontos = int(pontos * self.multiplicador_aniversario)

        return pontos

    def calcular_valor_desconto(self, pontos: int) -> Decimal:
        """Calcula valor de desconto em R$ baseado nos pontos"""
        if pontos < self.pontos_minimos_resgate:
            return Decimal('0.00')

        return Decimal(pontos) / self.pontos_por_real_desconto


class ClienteFidelidade(TimeStampedModel):
    """Dados do cliente no programa de fidelidade"""

    class Nivel(models.TextChoices):
        BRONZE = 'BRONZE', 'Bronze'
        PRATA = 'PRATA', 'Prata'
        OURO = 'OURO', 'Ouro'
        DIAMANTE = 'DIAMANTE', 'Diamante'

    cliente = models.OneToOneField(
        Cliente,
        on_delete=models.CASCADE,
        related_name='fidelidade'
    )

    programa = models.ForeignKey(
        ProgramaFidelidade,
        on_delete=models.CASCADE,
        related_name='clientes'
    )

    pontos_atual = models.IntegerField(
        default=0,
        help_text="Pontos disponíveis atualmente"
    )

    pontos_total_acumulado = models.IntegerField(
        default=0,
        help_text="Total de pontos ganhos desde sempre"
    )

    pontos_total_usado = models.IntegerField(
        default=0,
        help_text="Total de pontos usados"
    )

    nivel = models.CharField(
        max_length=10,
        choices=Nivel.choices,
        default=Nivel.BRONZE
    )

    data_adesao = models.DateField(auto_now_add=True)

    ativo = models.BooleanField(default=True)

    class Meta:
        unique_together = ['cliente', 'programa']
        verbose_name = "Cliente Fidelidade"
        verbose_name_plural = "Clientes Fidelidade"

    def __str__(self):
        return f"{self.cliente.nome} - {self.pontos_atual} pts"

    def adicionar_pontos(self, pontos: int, motivo: str = "", venda_id: int = None):
        """Adiciona pontos ao cliente"""
        saldo_anterior = self.pontos_atual
        self.pontos_atual += pontos
        self.pontos_total_acumulado += pontos
        self.save(update_fields=['pontos_atual', 'pontos_total_acumulado', 'updated_at'])

        # Registra movimentação
        MovimentacaoPontos.objects.create(
            cliente_fidelidade=self,
            tipo='CREDITO',
            pontos=pontos,
            saldo_anterior=saldo_anterior,
            saldo_novo=self.pontos_atual,
            motivo=motivo,
            venda_id=venda_id
        )

        # Atualiza nível
        self.atualizar_nivel()

    def usar_pontos(self, pontos: int, motivo: str = "", venda_id: int = None):
        """Usa pontos do cliente"""
        if pontos > self.pontos_atual:
            raise ValueError(f"Cliente não tem pontos suficientes. Disponível: {self.pontos_atual}")

        saldo_anterior = self.pontos_atual
        self.pontos_atual -= pontos
        self.pontos_total_usado += pontos
        self.save(update_fields=['pontos_atual', 'pontos_total_usado', 'updated_at'])

        # Registra movimentação
        MovimentacaoPontos.objects.create(
            cliente_fidelidade=self,
            tipo='DEBITO',
            pontos=pontos,
            saldo_anterior=saldo_anterior,
            saldo_novo=self.pontos_atual,
            motivo=motivo,
            venda_id=venda_id
        )

    def atualizar_nivel(self):
        """Atualiza nível do cliente baseado em pontos acumulados"""
        total = self.pontos_total_acumulado

        if total >= 10000:
            novo_nivel = self.Nivel.DIAMANTE
        elif total >= 5000:
            novo_nivel = self.Nivel.OURO
        elif total >= 2000:
            novo_nivel = self.Nivel.PRATA
        else:
            novo_nivel = self.Nivel.BRONZE

        if novo_nivel != self.nivel:
            self.nivel = novo_nivel
            self.save(update_fields=['nivel', 'updated_at'])

    def expirar_pontos(self):
        """Expira pontos antigos"""
        if not self.programa.pontos_expiram:
            return 0

        data_limite = timezone.now().date() - timedelta(days=self.programa.dias_validade_pontos)

        # Busca movimentações antigas de crédito
        movimentacoes_antigas = MovimentacaoPontos.objects.filter(
            cliente_fidelidade=self,
            tipo='CREDITO',
            data__lt=data_limite,
            expirado=False
        )

        pontos_expirados = 0
        for mov in movimentacoes_antigas:
            pontos_expirados += mov.pontos
            mov.expirado = True
            mov.save(update_fields=['expirado'])

        if pontos_expirados > 0:
            saldo_anterior = self.pontos_atual
            self.pontos_atual -= pontos_expirados
            self.save(update_fields=['pontos_atual', 'updated_at'])

            # Registra expiração
            MovimentacaoPontos.objects.create(
                cliente_fidelidade=self,
                tipo='EXPIRACAO',
                pontos=pontos_expirados,
                saldo_anterior=saldo_anterior,
                saldo_novo=self.pontos_atual,
                motivo=f"Expiração de pontos antigos (>{self.programa.dias_validade_pontos} dias)"
            )

        return pontos_expirados


class MovimentacaoPontos(TimeStampedModel):
    """Histórico de movimentações de pontos"""

    class Tipo(models.TextChoices):
        CREDITO = 'CREDITO', 'Crédito'
        DEBITO = 'DEBITO', 'Débito'
        EXPIRACAO = 'EXPIRACAO', 'Expiração'
        AJUSTE = 'AJUSTE', 'Ajuste Manual'

    cliente_fidelidade = models.ForeignKey(
        ClienteFidelidade,
        on_delete=models.CASCADE,
        related_name='movimentacoes'
    )

    tipo = models.CharField(max_length=10, choices=Tipo.choices)

    pontos = models.IntegerField()

    saldo_anterior = models.IntegerField()
    saldo_novo = models.IntegerField()

    motivo = models.TextField(blank=True)

    venda_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="ID da venda relacionada (se houver)"
    )

    data = models.DateField(auto_now_add=True)

    expirado = models.BooleanField(
        default=False,
        help_text="Indica se estes pontos já expiraram"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Movimentação de Pontos"
        verbose_name_plural = "Movimentações de Pontos"

    def __str__(self):
        operacao = "+" if self.tipo == 'CREDITO' else "-"
        return f"{self.cliente_fidelidade.cliente.nome}: {operacao}{self.pontos} pts"


class Recompensa(TimeStampedModel):
    """Recompensas que podem ser resgatadas com pontos"""

    class Tipo(models.TextChoices):
        DESCONTO = 'DESCONTO', 'Desconto em Compra'
        PRODUTO = 'PRODUTO', 'Produto Grátis'
        BRINDE = 'BRINDE', 'Brinde'

    programa = models.ForeignKey(
        ProgramaFidelidade,
        on_delete=models.CASCADE,
        related_name='recompensas'
    )

    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)

    tipo = models.CharField(max_length=10, choices=Tipo.choices)

    pontos_necessarios = models.IntegerField(
        validators=[MinValueValidator(1)]
    )

    # Para tipo DESCONTO
    valor_desconto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )

    # Para tipo PRODUTO ou BRINDE
    produto = models.ForeignKey(
        Produto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    quantidade = models.IntegerField(default=1)

    imagem = models.ImageField(
        upload_to='recompensas/',
        null=True,
        blank=True
    )

    ativa = models.BooleanField(default=True)

    quantidade_disponivel = models.IntegerField(
        default=0,
        help_text="Quantidade de resgates disponíveis (0=ilimitado)"
    )

    validade_inicio = models.DateField(null=True, blank=True)
    validade_fim = models.DateField(null=True, blank=True)

    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordem', 'pontos_necessarios']
        verbose_name = "Recompensa"
        verbose_name_plural = "Recompensas"

    def __str__(self):
        return f"{self.nome} - {self.pontos_necessarios} pts"

    def esta_disponivel(self) -> tuple[bool, str]:
        """Verifica se recompensa está disponível"""
        if not self.ativa:
            return False, "Recompensa desativada"

        hoje = timezone.now().date()

        if self.validade_inicio and hoje < self.validade_inicio:
            return False, "Recompensa ainda não iniciou"

        if self.validade_fim and hoje > self.validade_fim:
            return False, "Recompensa expirada"

        if self.quantidade_disponivel > 0:
            # Conta resgates já feitos
            resgates = ResgatePontos.objects.filter(recompensa=self).count()
            if resgates >= self.quantidade_disponivel:
                return False, "Recompensa esgotada"

        return True, ""


class ResgatePontos(TimeStampedModel):
    """Registro de resgate de recompensas"""

    class Status(models.TextChoices):
        PENDENTE = 'PENDENTE', 'Pendente'
        UTILIZADO = 'UTILIZADO', 'Utilizado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    cliente_fidelidade = models.ForeignKey(
        ClienteFidelidade,
        on_delete=models.PROTECT,
        related_name='resgates'
    )

    recompensa = models.ForeignKey(
        Recompensa,
        on_delete=models.PROTECT
    )

    pontos_gastos = models.IntegerField()

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDENTE
    )

    venda_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="ID da venda onde foi utilizado"
    )

    data_utilizacao = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Resgate de Pontos"
        verbose_name_plural = "Resgates de Pontos"

    def __str__(self):
        return f"{self.cliente_fidelidade.cliente.nome} - {self.recompensa.nome}"
