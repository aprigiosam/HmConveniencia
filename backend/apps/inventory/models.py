from django.db import models
from apps.core.models import TimeStampedModel, Loja
from apps.catalog.models import Produto, LoteProduto


class MovimentacaoEstoque(TimeStampedModel):
    class Tipo(models.TextChoices):
        ENTRADA = "ENTRADA", "Entrada"
        SAIDA = "SAIDA", "Saída"
        AJUSTE = "AJUSTE", "Ajuste"

    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="movimentacoes")
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT, related_name="movimentacoes")
    lote = models.ForeignKey(LoteProduto, on_delete=models.PROTECT, null=True, blank=True)
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    quantidade_anterior = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    motivo = models.CharField(max_length=255)
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tipo} - {self.produto.nome} - {self.quantidade}"


class TransferenciaEstoque(TimeStampedModel):
    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        ENVIADA = "ENVIADA", "Enviada"
        RECEBIDA = "RECEBIDA", "Recebida"
        CANCELADA = "CANCELADA", "Cancelada"

    loja_origem = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="transferencias_enviadas")
    loja_destino = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="transferencias_recebidas")
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    lote_origem = models.ForeignKey(LoteProduto, on_delete=models.PROTECT, related_name="transferencias_origem")
    lote_destino = models.ForeignKey(LoteProduto, on_delete=models.PROTECT, null=True, blank=True, related_name="transferencias_destino")
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    data_envio = models.DateTimeField(null=True, blank=True)
    data_recebimento = models.DateTimeField(null=True, blank=True)
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Transferência {self.produto.nome} - {self.loja_origem.nome} -> {self.loja_destino.nome}"


class InventarioEstoque(TimeStampedModel):
    class Status(models.TextChoices):
        ABERTO = "ABERTO", "Aberto"
        FINALIZADO = "FINALIZADO", "Finalizado"

    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="inventarios")
    data_inventario = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ABERTO)
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ['-data_inventario']

    def __str__(self):
        return f"Inventário {self.loja.nome} - {self.data_inventario}"


class ItemInventario(TimeStampedModel):
    inventario = models.ForeignKey(InventarioEstoque, on_delete=models.CASCADE, related_name="itens")
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    lote = models.ForeignKey(LoteProduto, on_delete=models.PROTECT, null=True, blank=True)
    quantidade_sistema = models.DecimalField(max_digits=10, decimal_places=2)
    quantidade_contada = models.DecimalField(max_digits=10, decimal_places=2)
    diferenca = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        ordering = ['produto__nome']
        unique_together = (('inventario', 'produto', 'lote'),)

    def save(self, *args, **kwargs):
        self.diferenca = self.quantidade_contada - self.quantidade_sistema
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.inventario} - {self.produto.nome}"
