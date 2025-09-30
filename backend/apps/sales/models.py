from decimal import Decimal

from django.contrib.auth import get_user_model
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
