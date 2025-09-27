from django.db import models

from apps.core.models import Loja, TimeStampedModel


class Categoria(TimeStampedModel):
    nome = models.CharField(max_length=150, unique=True)
    descricao = models.TextField(blank=True)
    categoria_pai = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategorias",
    )

    class Meta:
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class Fornecedor(TimeStampedModel):
    cnpj_cpf = models.CharField(max_length=20, unique=True)
    nome = models.CharField(max_length=255)
    telefone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    endereco = models.JSONField(default=dict, blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class Produto(TimeStampedModel):
    UNIDADE_PADRAO = "UN"

    sku = models.CharField(max_length=50, unique=True)
    codigo_barras = models.CharField(max_length=64, unique=True)
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="produtos")
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.PROTECT, related_name="produtos")
    unidade = models.CharField(max_length=10, default=UNIDADE_PADRAO)
    preco_custo = models.DecimalField(max_digits=10, decimal_places=2)
    preco_venda = models.DecimalField(max_digits=10, decimal_places=2)
    estoque_minimo = models.PositiveIntegerField(default=0)
    controla_vencimento = models.BooleanField(default=False)
    dias_alerta_vencimento = models.PositiveIntegerField(default=0)
    permite_venda_vencido = models.BooleanField(default=False)
    desconto_produto_vencido = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ("nome",)

    def __str__(self) -> str:
        return self.nome


class LoteProduto(TimeStampedModel):
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name="lotes")
    loja = models.ForeignKey(Loja, on_delete=models.CASCADE, related_name="lotes")
    numero_lote = models.CharField(max_length=100)
    data_vencimento = models.DateField(null=True, blank=True)
    quantidade = models.PositiveIntegerField(default=0)
    custo_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ("data_vencimento", "numero_lote")
        unique_together = (("produto", "numero_lote"),)

    def __str__(self) -> str:
        return f"{self.numero_lote} - {self.produto.nome}"
