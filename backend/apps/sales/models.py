from django.db import models
from decimal import Decimal
from apps.core.models import TimeStampedModel, Loja, Cliente, FormaPagamento
from apps.catalog.models import Produto, LoteProduto


class Venda(TimeStampedModel):
    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        FINALIZADA = "FINALIZADA", "Finalizada"
        CANCELADA = "CANCELADA", "Cancelada"

    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="vendas")
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, null=True, blank=True, related_name="vendas")
    numero_venda = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    valor_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    valor_desconto = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Venda {self.numero_venda}"

    def calcular_total(self):
        self.valor_subtotal = sum(item.valor_total for item in self.itens.all())
        self.valor_total = self.valor_subtotal - self.valor_desconto
        self.save()


class ItemVenda(TimeStampedModel):
    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name="itens")
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    lote = models.ForeignKey(LoteProduto, on_delete=models.PROTECT, null=True, blank=True)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['id']

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
        ordering = ['id']

    def __str__(self):
        return f"{self.forma_pagamento.nome} - R$ {self.valor}"
