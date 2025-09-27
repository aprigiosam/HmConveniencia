from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Loja(TimeStampedModel):
    cnpj = models.CharField(max_length=18, unique=True)
    nome = models.CharField(max_length=255)
    endereco = models.JSONField(default=dict, blank=True)
    telefone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class Cliente(TimeStampedModel):
    cpf = models.CharField(max_length=14, unique=True)
    nome = models.CharField(max_length=255)
    telefone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    endereco = models.JSONField(default=dict, blank=True)
    pontos_fidelidade = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class FormaPagamento(TimeStampedModel):
    class Tipo(models.TextChoices):
        DINHEIRO = "DINHEIRO", "Dinheiro"
        DEBITO = "DEBITO", "Cartao de Debito"
        CREDITO = "CREDITO", "Cartao de Credito"
        PIX = "PIX", "Pix"
        TRANSFERENCIA = "TRANSFERENCIA", "Transferencia"

    nome = models.CharField(max_length=100, unique=True)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    taxa = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    prazo_recebimento = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome
