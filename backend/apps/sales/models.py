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
    saldo_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    saldo_fechamento = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ["-aberta_em"]

    def __str__(self) -> str:  # pragma: no cover - representação simples
        return self.codigo or "Sessão PDV"

    @property
    def esta_aberta(self) -> bool:
        return self.status == self.Status.ABERTA

    def save(self, *args, **kwargs):
        if not self.codigo and self.loja_id:
            self.codigo = SequenciaDocumento.gerar_numero(
                loja=self.loja,
                codigo=self.CODIGO_SEQUENCIA,
            )
        super().save(*args, **kwargs)

    def fechar(self, *, saldo_fechamento: Decimal | None = None) -> None:
        if not self.esta_aberta:
            raise ValueError("Sessão já está fechada")

        self.status = self.Status.FECHADA
        self.fechada_em = timezone.now()
        if saldo_fechamento is not None:
            self.saldo_fechamento = saldo_fechamento
        self.save(update_fields=["status", "fechada_em", "saldo_fechamento", "updated_at"])


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
