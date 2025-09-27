from django.db import models
from decimal import Decimal
from apps.core.models import TimeStampedModel, Loja
from apps.sales.models import Venda


class ContaReceber(TimeStampedModel):
    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        PAGO = "PAGO", "Pago"
        VENCIDO = "VENCIDO", "Vencido"
        CANCELADO = "CANCELADO", "Cancelado"

    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="contas_receber")
    venda = models.ForeignKey(Venda, on_delete=models.PROTECT, null=True, blank=True, related_name="contas_receber")
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data_vencimento = models.DateField()
    data_pagamento = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ['data_vencimento']

    def __str__(self):
        return f"{self.descricao} - R$ {self.valor}"


class ContaPagar(TimeStampedModel):
    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        PAGO = "PAGO", "Pago"
        VENCIDO = "VENCIDO", "Vencido"
        CANCELADO = "CANCELADO", "Cancelado"

    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="contas_pagar")
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data_vencimento = models.DateField()
    data_pagamento = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ['data_vencimento']

    def __str__(self):
        return f"{self.descricao} - R$ {self.valor}"


class FluxoCaixa(TimeStampedModel):
    class Tipo(models.TextChoices):
        ENTRADA = "ENTRADA", "Entrada"
        SAIDA = "SAIDA", "Saída"

    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="fluxo_caixa")
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data = models.DateField()
    conta_receber = models.ForeignKey(ContaReceber, on_delete=models.SET_NULL, null=True, blank=True)
    conta_pagar = models.ForeignKey(ContaPagar, on_delete=models.SET_NULL, null=True, blank=True)
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ['-data', '-created_at']

    def __str__(self):
        return f"{self.tipo} - {self.descricao} - R$ {self.valor}"
